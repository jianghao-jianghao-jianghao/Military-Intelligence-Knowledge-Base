
import React, { useState, useRef, useEffect } from 'react';
import { Icons, MOCK_KBS } from '../constants.tsx';
import { ChatService } from '../services/api.ts'; // Updated Import
import { RetrievalConfig, User, Conversation, Message, Provenance, KnowledgeBase } from '../types.ts';
import EvidencePanel from './EvidencePanel.tsx';

interface QAViewProps {
  currentUser: User;
  onOpenDocument?: (docId: string) => void;
}

const QAView: React.FC<QAViewProps> = ({ currentUser, onOpenDocument }) => {
  // --- Global State ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // For progress bar
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // New Chat Wizard State
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);

  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<Provenance[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  
  // Load Session List on Mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load Messages when Conversation ID changes
  useEffect(() => {
    if (currentConvId) {
      loadHistory(currentConvId);
    }
  }, [currentConvId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentMessages]);

  // --- API Interaction Wrappers ---

  const loadSessions = async () => {
    try {
      const res = await ChatService.getSessions();
      setConversations(res.data);
      if (res.data.length > 0 && !currentConvId) {
        setCurrentConvId(res.data[0].id);
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
      // Fallback for demo if backend is offline
      if (conversations.length === 0) {
        const demoConv: Conversation = {
           id: 'c1-demo', title: '15式坦克高原性能分析 (Demo)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), bound_kb_ids: ['kb-1'], messages: []
        };
        setConversations([demoConv]);
        setCurrentConvId(demoConv.id);
      }
    }
  };

  const loadHistory = async (id: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await ChatService.getHistory(id);
      setCurrentMessages(res.data);
      // Update evidence from last AI message if exists
      const lastAiMsg = [...res.data].reverse().find(m => m.role === 'assistant');
      if (lastAiMsg?.qaResponse?.provenance) {
        setActiveEvidence(lastAiMsg.qaResponse.provenance);
      } else {
        setActiveEvidence([]);
      }
    } catch (e) {
      console.error("Failed to load history", e);
      setCurrentMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Find current conversation object
  const currentConversation = conversations.find(c => c.id === currentConvId) || conversations[0];

  // Helper: Check KB Permission
  const hasKbAccess = (kb: KnowledgeBase): boolean => {
      // Logic for demo permissions
      return (
          kb.authorized_roles.includes(currentUser.roleId) || 
          kb.authorized_departments.includes(currentUser.departmentId) ||
          kb.authorized_users.includes(currentUser.id)
      );
  };

  const [retrievalConfig, setRetrievalConfig] = useState<RetrievalConfig>({
    selected_kb_ids: [], // Dynamically set per chat
    strategy: 'hybrid',
    tiers: { faq: true, graph: true, docs: true, llm: true },
    enhanced: { queryRewrite: true, hyde: false, stepback: true }
  });

  // --- Handlers ---

  const openNewChatWizard = () => {
      setNewChatTitle('');
      // Pre-select all available KBs by default
      const availableIds = MOCK_KBS.filter(kb => hasKbAccess(kb)).map(kb => kb.id);
      setSelectedKbIds(availableIds);
      setIsNewChatModalOpen(true);
  };

  const handleCreateChat = async () => {
    if (selectedKbIds.length === 0) {
        alert("请至少选择一个知识库绑定会话。");
        return;
    }
    
    try {
      // Call API to create session
      const res = await ChatService.createSession({
        title: newChatTitle.trim() || undefined,
        bound_kb_ids: selectedKbIds
      });
      
      const newConv = res.data;
      setConversations([newConv, ...conversations]);
      setCurrentConvId(newConv.id);
      setActiveQuote(null);
      setActiveEvidence([]);
      setIsNewChatModalOpen(false);
    } catch (e) {
      alert("创建会话失败");
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除此会话记录吗？此操作不可逆。')) return;

    try {
      await ChatService.deleteSession(id);
      const newConvs = conversations.filter(c => c.id !== id);
      setConversations(newConvs);
      if (currentConvId === id && newConvs.length > 0) {
        setCurrentConvId(newConvs[0].id);
      } else if (newConvs.length === 0) {
        setCurrentConvId(null);
        setCurrentMessages([]);
      }
    } catch (error) {
      alert("删除失败");
    }
  };

  const handleRenameChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const oldTitle = conversations.find(c => c.id === id)?.title;
    const newTitle = prompt("请输入新的会话主题:", oldTitle);
    
    if (newTitle && newTitle !== oldTitle) {
      try {
        await ChatService.renameSession(id, { title: newTitle });
        setConversations(conversations.map(c => c.id === id ? { ...c, title: newTitle } : c));
      } catch (err) {
        alert("重命名失败");
      }
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setActiveQuote(selection.toString().trim());
    }
  };

  const handleSuggestClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(undefined, suggestion);
  };

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const finalQuery = overrideQuery || query;
    if (!finalQuery.trim() || !currentConvId) return;

    // Use current conversation's bound KBs
    const activeKbIds = currentConversation?.bound_kb_ids || [];
    if (activeKbIds.length === 0) {
        alert("当前会话未绑定任何有效的知识库，无法进行检索。");
        return;
    }

    setIsSearching(true);
    
    // 1. Optimistic User Message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: finalQuery,
      quote: activeQuote || undefined,
      timestamp: new Date().toISOString()
    };
    setCurrentMessages(prev => [...prev, tempUserMsg]);
    setQuery('');
    setActiveQuote(null);

    // Simulate tiered search delay for UI effect
    for (let i = 1; i <= 5; i++) {
      setCurrentStep(i);
      await new Promise(r => setTimeout(r, 300));
    }

    try {
      const sessionConfig = { ...retrievalConfig, selected_kb_ids: activeKbIds };
      
      // 2. Call API
      const res = await ChatService.sendMessage(
        currentConvId,
        finalQuery,
        sessionConfig,
        tempUserMsg.quote
      );
      
      // 3. Update with real response
      const aiMsg: Message = {
        id: res.data.id || `ai-${Date.now()}`,
        role: 'assistant',
        content: res.data.answer,
        timestamp: res.data.timestamp || new Date().toISOString(),
        qaResponse: res.data
      };

      setCurrentMessages(prev => [...prev, aiMsg]);
      setActiveEvidence(res.data.provenance);
      
      // Update session list timestamp if needed
      setConversations(prev => prev.map(c => c.id === currentConvId ? { ...c, updated_at: new Date().toISOString() } : c));

    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "系统繁忙或连接断开，检索服务暂时不可用。",
        timestamp: new Date().toISOString()
      };
      setCurrentMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSearching(false);
      setCurrentStep(0);
    }
  };

  const handleDownloadEvidence = async () => {
    if (!currentConvId) return;
    try {
        const url = await ChatService.exportEvidence(currentConvId);
        // Create temp link to trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `evidence_chain_${currentConvId}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        alert("下载证据包失败");
    }
  };

  const handleSuggestFAQ = async (aiMsg: Message, userMsg?: Message) => {
    if (!currentConvId) return;
    if (!userMsg) {
        alert("无法定位原始提问，建议手动提交。");
        return;
    }
    
    if(!window.confirm("确定要将此问答对提交至知识治理中心进行审计吗？")) return;

    try {
        await ChatService.submitFeedbackToFAQ({
            conversation_id: currentConvId,
            question: userMsg.content,
            answer: aiMsg.content
        });
        alert("该回答已提交至知识治理中心，等待机密审计员审批。");
    } catch (e) {
        alert("提交失败，请稍后重试。");
    }
  };

  const steps = [
    { id: 1, label: '跨库权限预审 (ACL)' },
    { id: 2, label: 'FAQ 库快速响应' },
    { id: 3, label: '知识图谱精准锚定' },
    { id: 4, label: '技术档案深度 RAG' },
    { id: 5, label: 'LLM 逻辑增强生成' }
  ];

  return (
    <div className="flex h-full relative overflow-hidden">
      
      {/* --- Left Sidebar: Conversation Management --- */}
      <div className="w-64 bg-[#f6f8fa] dark:bg-[#0d1117] border-r border-[#d0d7de] dark:border-[#30363d] flex flex-col flex-shrink-0">
         <div className="p-4 border-b border-[#d0d7de] dark:border-[#30363d]">
            <button 
              onClick={openNewChatWizard}
              className="w-full flex items-center justify-center gap-2 bg-[#2da44e] text-white py-2 rounded-md text-xs font-bold shadow-sm hover:opacity-90 transition-all active:scale-95"
            >
               <Icons.Plus /> 新建会话
            </button>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <p className="px-2 py-2 text-[10px] font-black text-[#8b949e] uppercase tracking-widest">历史对话记录</p>
            {conversations.map(conv => (
               <div 
                 key={conv.id} 
                 onClick={() => setCurrentConvId(conv.id)}
                 className={`group flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer text-xs transition-colors ${
                   currentConvId === conv.id 
                     ? 'bg-white dark:bg-[#1c2128] shadow-sm border border-[#d0d7de] dark:border-[#30363d] font-bold text-[#24292f] dark:text-[#c9d1d9]' 
                     : 'text-[#57606a] dark:text-[#8b949e] hover:bg-[#eaeef2] dark:hover:bg-[#21262d] border border-transparent'
                 }`}
               >
                 <div className="flex items-center gap-2 overflow-hidden">
                    <span className="flex-shrink-0">💬</span>
                    <span className="truncate">{conv.title}</span>
                 </div>
                 <div className="hidden group-hover:flex gap-1 ml-2">
                    <button onClick={(e) => handleRenameChat(e, conv.id)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-500">
                       <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.377-.192.957.957-.192.376-.106L5.454 8.544l-.308-.308-2.55 2.55z"/></svg>
                    </button>
                    <button onClick={(e) => handleDeleteChat(e, conv.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
                       <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                    </button>
                 </div>
               </div>
            ))}
         </div>
      </div>

      {/* --- Main Chat Area --- */}
      <div className="flex-1 flex flex-col h-full bg-[#ffffff] dark:bg-[#0d1117] min-w-0">
        
        {/* Top Bar */}
        <div className="px-6 py-3 border-b border-[#d0d7de] dark:border-[#30363d] bg-[#f6f8fa]/50 dark:bg-[#0d1117] flex justify-between items-center z-20">
           <div className="flex gap-4">
              <button 
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className="text-xs font-bold border border-[#d0d7de] dark:border-[#30363d] px-3 py-1.5 rounded-md hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] flex items-center gap-2 transition-all active:scale-95 shadow-sm bg-white dark:bg-[#161b22]"
              >
                <span>⚙️</span> 检索配置
              </button>
              <div className="flex items-center gap-2 text-[10px] text-[#8b949e] font-mono">
                 <span className={retrievalConfig.enhanced.queryRewrite ? 'text-blue-500 font-bold' : ''}>Rewrite: ON</span>
                 <span className="opacity-30">|</span>
                 <span className={retrievalConfig.enhanced.stepback ? 'text-blue-500 font-bold' : ''}>Stepback: ON</span>
                 <span className="opacity-30">|</span>
                 <span className="font-bold">Bound KBs: {currentConversation?.bound_kb_ids?.length || 0}</span>
              </div>
           </div>
           {isSearching && (
             <div className="flex gap-4 items-center animate-pulse">
                <span className="text-[10px] font-black text-[#0366d6] dark:text-[#58a6ff] uppercase tracking-widest">{steps[currentStep-1]?.label}</span>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5].map(s => (
                    <div key={s} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${s <= currentStep ? 'bg-[#0366d6]' : 'bg-[#d0d7de] dark:bg-[#30363d]'}`}></div>
                  ))}
                </div>
             </div>
           )}
        </div>

        {/* Config Modal Omitted for brevity, logic remains same */}
        {/* ... */}

        {/* Chat Message List */}
        <div 
          className="flex-1 overflow-y-auto p-8 space-y-8" 
          ref={chatContainerRef}
          onMouseUp={handleTextSelection}
        >
          {isLoadingHistory ? (
             <div className="flex items-center justify-center h-full text-[#8b949e] text-xs">加载历史记录中...</div>
          ) : currentMessages.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                <div className="w-20 h-20 mb-6 text-[#d0d7de] dark:text-[#30363d]">
                   <Icons.Search />
                </div>
                <p className="font-bold text-base tracking-[0.2em] text-[#8b949e] mt-4 uppercase">Advanced Military Retrieval</p>
                <div className="grid grid-cols-2 gap-4 mt-12 w-full max-w-xl">
                   {['15式坦克涉密试验数据', '某型导弹火控逻辑分析', '动力系统故障排查手册'].map(tag => (
                     <button key={tag} onClick={() => setQuery(tag)} className="p-3 text-xs border border-dashed border-[#d0d7de] dark:border-[#30363d] rounded-lg hover:border-blue-500 transition-colors text-left truncate">
                        # {tag}
                     </button>
                   ))}
                </div>
             </div>
          ) : (
             currentMessages.map((msg, index) => (
                <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                   
                   {msg.role === 'user' && (
                     <>
                        {msg.quote && (
                           <div className="mr-2 mb-1 max-w-xl bg-[#f6f8fa] dark:bg-[#21262d] border-l-4 border-blue-500 p-3 rounded-r text-xs text-[#57606a] dark:text-[#8b949e] italic relative">
                              <span className="font-black text-[9px] uppercase block mb-1 not-italic text-blue-500">引用内容</span>
                              "{msg.quote}"
                           </div>
                        )}
                        <div className="bg-[#0366d6] text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm shadow-md">
                           {msg.content}
                        </div>
                        <span className="text-[10px] text-[#8b949e] mr-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     </>
                   )}

                   {msg.role === 'assistant' && msg.qaResponse && (
                     <div className="w-full max-w-4xl">
                        {/* AI Response Header and Content same as before */}
                        <div className="flex items-center gap-3 mb-2 ml-1">
                           <div className="w-6 h-6 rounded bg-gradient-to-tr from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs">AI</div>
                           <span className="text-xs font-bold text-[#24292f] dark:text-[#c9d1d9]">研制大脑</span>
                           <span className={`text-[9px] font-black px-1.5 py-0.5 border rounded uppercase ${
                              msg.qaResponse.security_badge === '机密' ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'
                           }`}>{msg.qaResponse.security_badge}</span>
                        </div>
                        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl shadow-sm overflow-hidden">
                           <div className="p-6 space-y-4">
                              <p className="text-sm dark:text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              {msg.qaResponse.media && msg.qaResponse.media.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                                   {msg.qaResponse.media.map((item, mIdx) => (
                                     <div key={mIdx} className="bg-black/5 dark:bg-white/5 border border-dashed border-[#d0d7de] dark:border-[#30363d] rounded-lg overflow-hidden relative aspect-video group cursor-pointer hover:border-blue-500 transition-colors">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                           {item.type === 'video' ? <span className="text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center">▶</span> : <Icons.File />}
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[9px] text-white truncate text-center">{item.caption}</div>
                                     </div>
                                   ))}
                                </div>
                              )}
                           </div>
                           <div className="bg-[#f6f8fa] dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d] p-4">
                              <details className="group">
                                 <summary className="flex items-center gap-2 text-[10px] font-bold text-[#57606a] dark:text-[#8b949e] cursor-pointer hover:text-blue-500 list-none">
                                    <span className="transition-transform group-open:rotate-90">▶</span>
                                    查看推理溯源链 (Thought Process)
                                 </summary>
                                 <div className="mt-3 pl-4 border-l border-[#d0d7de] dark:border-[#30363d] space-y-3">
                                    {msg.qaResponse.thought_process.map((step, sIdx) => (
                                       <div key={sIdx}>
                                          <p className="text-[10px] font-black uppercase text-[#8b949e]">{step.title}</p>
                                          <p className="text-[11px] text-[#24292f] dark:text-[#c9d1d9]">{step.content}</p>
                                       </div>
                                    ))}
                                 </div>
                              </details>
                              {/* Suggestions ... */}
                              <div className="flex justify-end gap-2 mt-2">
                                 <button onClick={() => handleSuggestFAQ(msg, currentMessages[index-1])} className="text-[10px] font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 px-2 py-1 rounded border border-transparent hover:border-green-500/20">回流至 FAQ</button>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d]">
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto relative">
            {activeQuote && (
               <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#f6f8fa] dark:bg-[#161b22] border border-blue-500/30 border-l-4 border-l-blue-500 p-3 rounded-lg shadow-lg flex justify-between items-start animate-in slide-in-from-bottom-2">
                  <div className="pr-4">
                     <span className="text-[9px] font-black text-blue-500 uppercase block mb-1">正在引用上下文</span>
                     <p className="text-xs text-[#57606a] dark:text-[#c9d1d9] line-clamp-2 italic">"{activeQuote}"</p>
                  </div>
                  <button type="button" onClick={() => setActiveQuote(null)} className="text-[#8b949e] hover:text-red-500">✕</button>
               </div>
            )}

            <div className="relative group bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-[#0366d6] transition-all">
              <textarea 
                rows={1}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSearch();
                   }
                }}
                placeholder={activeQuote ? "基于引用内容进行追问..." : "在此输入您的武器研制业务指令..."}
                className="w-full bg-transparent border-none rounded-2xl py-5 px-6 pr-32 text-sm focus:outline-none resize-none"
              />
              <div className="absolute right-4 bottom-4">
                 <button 
                  type="submit"
                  disabled={isSearching || !currentConvId}
                  className="bg-[#0366d6] text-white px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all font-bold text-xs flex items-center gap-2"
                 >
                   {isSearching ? '分析中...' : '发送'}
                 </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right Evidence Panel */}
      <EvidencePanel 
         provenance={activeEvidence} 
         onOpenDocument={onOpenDocument}
         onDownloadPackage={handleDownloadEvidence}
      />

      {/* New Session Modal - logic same as before but calls handleCreateChat */}
      {isNewChatModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
             {/* ...Modal Content reused from previous code, triggering handleCreateChat... */}
             <div className="bg-[#0d1117] border border-[#30363d] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                 <div className="p-6 border-b border-[#30363d] bg-[#161b22] flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                       <span className="bg-green-600 text-white p-1 rounded"><Icons.Plus /></span> 初始化研制会话
                    </h3>
                    <button onClick={() => setIsNewChatModalOpen(false)} className="text-[#8b949e] hover:text-white">✕</button>
                 </div>
                 <div className="p-8 space-y-8 flex-1 overflow-y-auto bg-white dark:bg-[#0d1117]">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-[#8b949e] uppercase">会话主题 (Optional)</label>
                        <input value={newChatTitle} onChange={e => setNewChatTitle(e.target.value)} placeholder="e.g. 某型导弹热控系统故障排查" className="w-full bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-3 text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-4">
                        <label className="text-xs font-black text-[#8b949e] uppercase">绑定知识库</label>
                        <div className="grid grid-cols-2 gap-4">
                            {MOCK_KBS.map(kb => {
                                const active = selectedKbIds.includes(kb.id);
                                return (
                                    <div key={kb.id} onClick={() => setSelectedKbIds(prev => active ? prev.filter(i => i !== kb.id) : [...prev, kb.id])} 
                                      className={`p-4 rounded-xl border cursor-pointer ${active ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-white dark:bg-[#0d1117] border-[#d0d7de] dark:border-[#30363d]'}`}>
                                        <h4 className="font-bold text-sm">{kb.name}</h4>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                 </div>
                 <div className="p-6 border-t border-[#30363d] bg-[#161b22] flex justify-end gap-3">
                    <button onClick={() => setIsNewChatModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#c9d1d9] hover:bg-[#21262d] rounded-lg">取消</button>
                    <button onClick={handleCreateChat} disabled={selectedKbIds.length === 0} className="px-6 py-2 text-sm font-bold bg-[#238636] text-white rounded-lg shadow-lg hover:bg-[#2ea043] disabled:opacity-50">启动会话</button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default QAView;
