
import React, { useState } from 'react';
import { Icons, MOCK_KBS, MOCK_FAQS } from '../constants.tsx';
import { performQA } from '../services/geminiService.ts';
import { QAResponse, RetrievalConfig, User } from '../types.ts';
import EvidencePanel from './EvidencePanel.tsx';

interface QAViewProps {
  currentUser: User;
}

const QAView: React.FC<QAViewProps> = ({ currentUser }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const authorizedKBs = MOCK_KBS.filter(kb => 
    kb.authorized_roles.includes(currentUser.roleId) || 
    kb.authorized_departments.includes(currentUser.departmentId) ||
    kb.authorized_users.includes(currentUser.id)
  );

  const [retrievalConfig, setRetrievalConfig] = useState<RetrievalConfig>({
    selected_kb_ids: authorizedKBs.map(kb => kb.id),
    strategy: 'hybrid',
    tiers: {
      faq: true,
      graph: true,
      docs: true,
      llm: true
    },
    enhanced: { 
      queryRewrite: true, 
      hyde: false, 
      stepback: true 
    }
  });

  const steps = [
    { id: 1, label: '跨库权限预审 (ACL)' },
    { id: 2, label: 'FAQ 库快速响应' },
    { id: 3, label: '知识图谱精准锚定' },
    { id: 4, label: '技术档案深度 RAG' },
    { id: 5, label: 'LLM 逻辑增强生成' }
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (retrievalConfig.selected_kb_ids.length === 0) {
      alert("请至少选择一个知识库进行检索");
      return;
    }

    setIsSearching(true);
    setResponse(null);
    setCurrentStep(0);
    
    // Simulate tiered search delay
    for (let i = 1; i <= 5; i++) {
      setCurrentStep(i);
      await new Promise(r => setTimeout(r, 400));
    }

    try {
      const res = await performQA(query, retrievalConfig, currentUser);
      if (!res || !res.answer) {
         throw new Error("Empty response received");
      }
      setResponse(res);
    } catch (err) {
      console.error("Search execution failed:", err);
      // Even if it fails, set a visual fallback state if performQA didn't handle it
      // Note: performQA currently returns a fallback object on error, so this block
      // handles truly unexpected errors.
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestFAQ = () => {
    alert("该回答已提交至知识治理中心，等待机密审计员审批。");
  };

  return (
    <div className="flex h-full relative">
      <div className="flex-1 flex flex-col h-full bg-[#f6f8fa]/40 dark:bg-[#0d1117]">
        {/* Unified Config Bar */}
        <div className="px-8 py-4 border-b border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#0d1117] flex justify-between items-center shadow-sm z-20">
           <div className="flex gap-4">
              <button 
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className="text-xs font-bold border border-[#d0d7de] dark:border-[#30363d] px-4 py-1.5 rounded-md hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <span>⚙️</span> 可视化检索配置中心
              </button>
              <div className="flex items-center gap-2 text-[10px] text-[#8b949e] font-mono">
                 <span className={retrievalConfig.enhanced.queryRewrite ? 'text-blue-500' : ''}>Rewrite</span>
                 <span className="opacity-30">|</span>
                 <span className={retrievalConfig.enhanced.hyde ? 'text-blue-500' : ''}>HyDE</span>
                 <span className="opacity-30">|</span>
                 <span className={retrievalConfig.enhanced.stepback ? 'text-blue-500' : ''}>Stepback</span>
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

        {/* Enhanced Config Modal */}
        {isConfigOpen && (
          <div className="absolute top-16 left-8 z-50 w-[420px] bg-white dark:bg-[#1c2128] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
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
                   <p className="text-[10px] font-black text-[#8b949e] uppercase tracking-widest">智能增强插件 (Retrieval Augmentation)</p>
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
                      <label className="flex items-start gap-3 p-3 rounded bg-[#f6f8fa] dark:bg-[#0d1117] border dark:border-[#30363d] cursor-pointer">
                         <input type="checkbox" checked={retrievalConfig.enhanced.stepback} onChange={(e) => setRetrievalConfig({...retrievalConfig, enhanced: {...retrievalConfig.enhanced, stepback: e.target.checked}})} className="mt-1" />
                         <div>
                            <p className="text-xs font-bold">深层背景检索 (Step-back)</p>
                            <p className="text-[10px] text-[#8b949e]">抽象出高层级概念进行原理背景检索</p>
                         </div>
                      </label>
                   </div>
                </div>
             </div>

             <button onClick={() => setIsConfigOpen(false)} className="w-full py-2.5 bg-[#0366d6] text-white rounded-xl text-xs font-bold shadow-lg">确认应用配置</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8">
          {response && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0366d6]">
                <div className="px-6 py-4 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-[#8b949e] uppercase">命中层级</span>
                        <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest">{response.tier_hit || 'DOCS'}</span>
                      </div>
                      <div className="h-6 w-px bg-[#d0d7de] dark:border-[#30363d]"></div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-[#8b949e] uppercase">密级状态</span>
                        <span className={`text-[11px] font-black ${response.security_badge === '机密' ? 'text-red-500' : 'text-green-500'}`}>{response.security_badge}</span>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={handleSuggestFAQ} className="text-[10px] font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 px-2 py-1 rounded border border-green-500/20">回流至 FAQ 库</button>
                      <button className="p-2 hover:bg-[#eaeef2] dark:hover:bg-[#21262d] rounded-xl text-[#57606a]"><Icons.Share /></button>
                   </div>
                </div>

                <div className="p-10 space-y-6 leading-relaxed">
                   <p className="text-[16px] dark:text-[#c9d1d9]">{response.answer}</p>
                   
                   {/* Multi-modal parts */}
                   {response.media && response.media.length > 0 && (
                     <div className="grid grid-cols-2 gap-4 mt-6">
                        {response.media.map((item, idx) => (
                          <div key={idx} className="bg-black/5 dark:bg-white/5 border border-dashed border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden group relative">
                             {item.type === 'image' && (
                               <div className="aspect-video flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                 <span className="text-[10px] font-mono text-gray-400">[ 密级图像预览: {item.caption} ]</span>
                               </div>
                             )}
                             {item.type === 'video' && (
                               <div className="aspect-video flex items-center justify-center bg-black relative">
                                  <div className="w-10 h-10 border-2 border-white rounded-full flex items-center justify-center text-white">▶</div>
                                  <span className="absolute bottom-2 left-2 text-[9px] text-white/60 bg-black/40 px-1 rounded">片段: {item.caption}</span>
                               </div>
                             )}
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </div>

              {/* Enhanced Reasoning Chain */}
              <div className="pl-6 border-l-2 border-[#d0d7de] dark:border-[#30363d] space-y-6">
                 <h5 className="text-[10px] font-black text-[#8b949e] uppercase tracking-[0.3em] mb-4">研制大脑推理溯源链</h5>
                 {response.thought_process.map((step, idx) => (
                   <div key={idx} className="relative group">
                      <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-white dark:bg-[#0d1117] border-2 border-[#0366d6] group-hover:scale-125 transition-transform"></div>
                      <p className="text-[10px] font-black text-[#57606a] dark:text-[#8b949e] uppercase">{step.title}</p>
                      <p className="text-xs text-[#24292f] dark:text-[#c9d1d9] mt-1 font-medium leading-relaxed">{step.content}</p>
                   </div>
                 ))}
              </div>
            </div>
          )}
          
          {!response && !isSearching && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
               <div className="w-24 h-24 mb-6 text-[#d0d7de] dark:text-[#30363d]">
                  <Icons.Search />
               </div>
               <p className="font-bold text-base tracking-[0.2em] text-[#8b949e] mt-4 uppercase">Advanced Military Retrieval</p>
               <div className="grid grid-cols-2 gap-4 mt-12 w-full max-w-xl">
                  {['15式坦克涉密试验数据', '某型导弹火控逻辑分析', '动力系统故障排查手册', '研制基地准入管理流程'].map(tag => (
                    <button key={tag} onClick={() => setQuery(tag)} className="p-3 text-xs border border-dashed border-[#d0d7de] dark:border-[#30363d] rounded-lg hover:border-blue-500 transition-colors text-left truncate">
                       # {tag}
                    </button>
                  ))}
               </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-white dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d]">
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            <div className="relative group bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-[#0366d6] transition-all">
              <textarea 
                rows={1}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="在此输入您的武器研制业务指令..."
                className="w-full bg-transparent border-none rounded-2xl py-5 px-6 pr-32 text-sm focus:outline-none resize-none"
              />
              <div className="absolute right-4 bottom-4">
                 <button 
                  type="submit"
                  disabled={isSearching}
                  className="bg-[#0366d6] text-white px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all font-bold text-xs flex items-center gap-2"
                 >
                   {isSearching ? '检索中...' : '启动分析'}
                 </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <EvidencePanel provenance={response?.provenance || []} />
    </div>
  );
};

export default QAView;
