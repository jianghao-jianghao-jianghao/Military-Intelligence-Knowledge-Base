
import React, { useState, useRef, useEffect } from 'react';
import { Icons, MOCK_KBS, MOCK_FAQS } from '../constants.tsx';
import { performQA } from '../services/geminiService.ts';
import { QAResponse, RetrievalConfig, User, Conversation, Message, Provenance } from '../types.ts';
import EvidencePanel from './EvidencePanel.tsx';

interface QAViewProps {
  currentUser: User;
}

const QAView: React.FC<QAViewProps> = ({ currentUser }) => {
  // --- Global State ---
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'c1',
      title: '15式坦克高原性能分析',
      createdAt: '2024-03-25 10:00',
      updatedAt: '2024-03-25 11:30',
      messages: [] // Simulating empty history for demo, usually loaded
    }
  ]);
  const [currentConvId, setCurrentConvId] = useState<string>('c1');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // For progress bar
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<Provenance[]>([]);

  // Find current conversation
  const currentConversation = conversations.find(c => c.id === currentConvId) || conversations[0];

  const authorizedKBs = MOCK_KBS.filter(kb => 
    kb.authorized_roles.includes(currentUser.roleId) || 
    kb.authorized_departments.includes(currentUser.departmentId) ||
    kb.authorized_users.includes(currentUser.id)
  );

  const [retrievalConfig, setRetrievalConfig] = useState<RetrievalConfig>({
    selected_kb_ids: authorizedKBs.map(kb => kb.id),
    strategy: 'hybrid',
    tiers: { faq: true, graph: true, docs: true, llm: true },
    enhanced: { queryRewrite: true, hyde: false, stepback: true }
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentConversation.messages]);

  // --- Handlers ---

  const handleNewChat = () => {
    const newConv: Conversation = {
      id: `c-${Date.now()}`,
      title: '新会话 ' + new Date().toLocaleTimeString(),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setConversations([newConv, ...conversations]);
    setCurrentConvId(newConv.id);
    setActiveQuote(null);
    setActiveEvidence([]);
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除此会话记录吗？此操作不可逆。')) {
      const newConvs = conversations.filter(c => c.id !== id);
      setConversations(newConvs);
      if (currentConvId === id && newConvs.length > 0) {
        setCurrentConvId(newConvs[0].id);
      } else if (newConvs.length === 0) {
        handleNewChat(); // Ensure at least one chat exists
      }
    }
  };

  const handleRenameChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newTitle = prompt("请输入新的会话主题:", conversations.find(c => c.id === id)?.title);
    if (newTitle) {
      setConversations(conversations.map(c => c.id === id ? { ...c, title: newTitle } : c));
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      // Basic check to ensure selection is within the chat area (optional refinement)
      setActiveQuote(selection.toString().trim());
    }
  };

  const handleSuggestClick = (suggestion: string) => {
    setQuery(suggestion);
    // Optional: Auto-submit or just fill? Let's just fill for safety, user clicks send.
    // Or better UX: Auto submit
    handleSearch(undefined, suggestion);
  };

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const finalQuery = overrideQuery || query;
    if (!finalQuery.trim() || retrievalConfig.selected_kb_ids.length === 0) return;

    setIsSearching(true);
    
    // 1. Add User Message
    const userMsg: Message = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: finalQuery,
      quote: activeQuote || undefined,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...currentConversation.messages, userMsg];
    
    // Optimistic update
    setConversations(conversations.map(c => 
      c.id === currentConvId ? { ...c, messages: updatedMessages, updatedAt: new Date().toISOString() } : c
    ));
    
    setQuery('');
    setActiveQuote(null); // Clear quote after sending

    // Simulate tiered search delay
    for (let i = 1; i <= 5; i++) {
      setCurrentStep(i);
      await new Promise(r => setTimeout(r, 400));
    }

    try {
      const res = await performQA(finalQuery, retrievalConfig, currentUser, userMsg.quote);
      
      // 2. Add Assistant Message
      const aiMsg: Message = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: res.answer, // Text summary
        timestamp: new Date().toISOString(),
        qaResponse: res
      };

      setConversations(prev => prev.map(c => 
        c.id === currentConvId ? { 
            ...c, 
            messages: [...c.messages, userMsg, aiMsg],
            // Update title if it's the first message
            title: c.messages.length === 0 ? finalQuery.slice(0, 15) : c.title 
        } : c
      ));

      // Update active evidence panel to show the latest result's provenance
      setActiveEvidence(res.provenance);

    } catch (err) {
      console.error(err);
      // Add Error Message
      const errorMsg: Message = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: "系统繁忙，检索服务暂时不可用。请稍后重试。",
        timestamp: new Date().toISOString()
      };
       setConversations(prev => prev.map(c => 
        c.id === currentConvId ? { ...c, messages: [...c.messages, userMsg, errorMsg] } : c
      ));
    } finally {
      setIsSearching(false);
      setCurrentStep(0);
    }
  };

  const handleSuggestFAQ = () => {
    alert("该回答已提交至知识治理中心，等待机密审计员审批。");
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
              onClick={handleNewChat}
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
                 {/* Action Buttons (Hover only) */}
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
        
        {/* Top Bar: Retrieval Config */}
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

        {/* Enhanced Config Modal (Same as before) */}
        {isConfigOpen && (
          <div className="absolute top-14 left-8 z-50 w-[420px] bg-white dark:bg-[#1c2128] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center pb-2 border-b dark:border-[#30363d]">
                <h4 className="font-bold text-sm">检索链路与增强策略</h4>
                <button onClick={() => setIsConfigOpen(false)} className="text-[#8b949e]">✕</button>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-2">
                   <p className="text-[10px] font-black text-[#8b949e] uppercase tracking-widest">分层检索架构 (Tiered Retrieval)</p>
                   <div className="grid grid-cols-2 gap-2">
                      {Object.entries(retrievalConfig.tiers).map(([tier, active]) => (
                        <label key={tier} className="flex items-center justify-between p-2 rounded border border-[#30363d] cursor-pointer hover:bg-white/5">
                           <span className="text-xs uppercase">{tier} 响应库</span>
                           <input 
                              type="checkbox" 
                              checked={active} 
                              onChange={(e) => setRetrievalConfig({...retrievalConfig, tiers: {...retrievalConfig.tiers, [tier]: e.target.checked}})} 
                           />
                        </label>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <p className="text-[10px] font-black text-[#8b949e] uppercase tracking-widest">智能增强插件</p>
                   <div className="space-y-2">
                      <label className="flex items-start gap-3 p-3 rounded bg-[#f6f8fa] dark:bg-[#0d1117] border dark:border-[#30363d] cursor-pointer">
                         <input type="checkbox" checked={retrievalConfig.enhanced.queryRewrite} onChange={(e) => setRetrievalConfig({...retrievalConfig, enhanced: {...retrievalConfig.enhanced, queryRewrite: e.target.checked}})} className="mt-1" />
                         <div>
                            <p className="text-xs font-bold">问题改写 (Query Rewrite)</p>
                            <p className="text-[10px] text-[#8b949e]">利用对话历史自动补全缺失信息</p>
                         </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 rounded bg-[#f6f8fa] dark:bg-[#0d1117] border dark:border-[#30363d] cursor-pointer">
                         <input type="checkbox" checked={retrievalConfig.enhanced.hyde} onChange={(e) => setRetrievalConfig({...retrievalConfig, enhanced: {...retrievalConfig.enhanced, hyde: e.target.checked}})} className="mt-1" />
                         <div>
                            <p className="text-xs font-bold">假设回答检索 (HyDE)</p>
                            <p className="text-[10px] text-[#8b949e]">生成虚拟答案后再进行语义空间检索</p>
                         </div>
                      </label>
                   </div>
                </div>
             </div>

             <button onClick={() => setIsConfigOpen(false)} className="w-full py-2.5 bg-[#0366d6] text-white rounded-xl text-xs font-bold shadow-lg">确认应用配置</button>
          </div>
        )}

        {/* Chat Message List */}
        <div 
          className="flex-1 overflow-y-auto p-8 space-y-8" 
          ref={chatContainerRef}
          onMouseUp={handleTextSelection} // Enable text selection for quoting
        >
          {currentConversation.messages.length === 0 ? (
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
             currentConversation.messages.map((msg, idx) => (
                <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                   
                   {/* User Message */}
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

                   {/* Assistant Message (Advanced Render) */}
                   {msg.role === 'assistant' && msg.qaResponse && (
                     <div className="w-full max-w-4xl">
                        {/* Header Info */}
                        <div className="flex items-center gap-3 mb-2 ml-1">
                           <div className="w-6 h-6 rounded bg-gradient-to-tr from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs">AI</div>
                           <span className="text-xs font-bold text-[#24292f] dark:text-[#c9d1d9]">研制大脑</span>
                           <span className={`text-[9px] font-black px-1.5 py-0.5 border rounded uppercase ${
                              msg.qaResponse.security_badge === '机密' ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'
                           }`}>{msg.qaResponse.security_badge}</span>
                        </div>

                        {/* Main Content Box */}
                        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl shadow-sm overflow-hidden">
                           
                           {/* Content Body */}
                           <div className="p-6 space-y-4">
                              <p className="text-sm dark:text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              
                              {/* Media Grid */}
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

                           {/* Footer: Reasoning & Actions */}
                           <div className="bg-[#f6f8fa] dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d] p-4">
                              {/* Reasoning Chain Collapsible (Simplified for chat) */}
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

                              {/* Smart Suggestions (Chips) */}
                              {msg.qaResponse.related_questions && msg.qaResponse.related_questions.length > 0 && (
                                 <div className="mt-4 pt-3 border-t border-[#d0d7de]/50 dark:border-[#30363d]/50">
                                    <p className="text-[9px] font-black text-[#8b949e] uppercase mb-2 flex items-center gap-2">
                                       <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                       智能关联追问
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                       {msg.qaResponse.related_questions.map((q, qIdx) => (
                                          <button 
                                            key={qIdx}
                                            onClick={() => handleSuggestClick(q)}
                                            className="text-xs bg-white dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] px-3 py-1.5 rounded-full hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all text-[#57606a] dark:text-[#c9d1d9]"
                                          >
                                             {q}
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                              )}
                              
                              <div className="flex justify-end gap-2 mt-2">
                                 <button onClick={handleSuggestFAQ} className="text-[10px] font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 px-2 py-1 rounded border border-transparent hover:border-green-500/20">回流至 FAQ</button>
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
            {/* Quote Context Preview */}
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
                  disabled={isSearching}
                  className="bg-[#0366d6] text-white px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all font-bold text-xs flex items-center gap-2"
                 >
                   {isSearching ? '分析中...' : '发送'}
                 </button>
              </div>
            </div>
            <p className="text-[10px] text-[#8b949e] mt-2 text-center">
               Tip: 选中对话中的任意文字，即可激活 <span className="font-bold text-[#0366d6]">“引用追问”</span> 模式。
            </p>
          </form>
        </div>
      </div>

      {/* Right Evidence Panel - Linked to Active Conversation */}
      <EvidencePanel 
         provenance={activeEvidence.length > 0 ? activeEvidence : (currentConversation.messages.slice(-1)[0]?.qaResponse?.provenance || [])} 
      />
    </div>
  );
};

export default QAView;
