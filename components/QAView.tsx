
import React, { useState } from 'react';
import { Icons, MOCK_KBS } from '../constants.tsx';
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
  
  // Fixed property names: authorized_roles exists now, department_id -> departmentId
  const authorizedKBs = MOCK_KBS.filter(kb => 
    kb.authorized_roles.includes(currentUser.role) || 
    kb.authorized_departments.includes(currentUser.departmentId)
  );

  const [retrievalConfig, setRetrievalConfig] = useState<RetrievalConfig>({
    selected_kb_ids: authorizedKBs.map(kb => kb.id),
    strategy: 'hybrid',
    enhanced: { queryRewrite: true, hyde: false, stepback: false }
  });

  const steps = [
    { id: 1, label: '跨库权限预审 (ACL)' },
    { id: 2, label: '研制库联邦检索 (FSR)' },
    { id: 3, label: '证据聚合校验 (EVC)' },
    { id: 4, label: 'LLM 安全生成 (SGE)' }
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || retrievalConfig.selected_kb_ids.length === 0) return;

    setIsSearching(true);
    setResponse(null);
    
    for (let i = 1; i <= 4; i++) {
      setCurrentStep(i);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const res = await performQA(query, retrievalConfig, currentUser);
      setResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
      setCurrentStep(0);
    }
  };

  const shareResponse = () => {
    const shareLink = `https://weaponbrain.gov/share/${Math.random().toString(36).substring(7)}`;
    navigator.clipboard.writeText(shareLink);
    alert("已生成阅后即焚分享链接（权限有效期: 24小时），链接已复制。");
  };

  return (
    <div className="flex h-full relative">
      <div className="flex-1 flex flex-col h-full bg-[#f6f8fa]/40 dark:bg-[#0d1117]">
        {/* Settings Bar */}
        <div className="px-8 py-4 border-b border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#0d1117] flex justify-between items-center shadow-sm z-20">
           <div className="flex gap-4">
              <button 
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className="text-xs font-bold border border-[#d0d7de] dark:border-[#30363d] px-4 py-1.5 rounded-md hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <span>⚙️</span> 配置查询域 ({retrievalConfig.selected_kb_ids.length})
              </button>
           </div>
           {isSearching && (
             <div className="flex gap-4 items-center">
                <span className="text-[10px] font-black text-[#0366d6] dark:text-[#58a6ff] uppercase tracking-widest">{steps[currentStep-1]?.label}</span>
                <div className="flex gap-1.5">
                  {[1,2,3,4].map(s => (
                    <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${s <= currentStep ? 'bg-[#0366d6] shadow-[0_0_8px_rgba(3,102,214,0.4)]' : 'bg-[#d0d7de] dark:bg-[#30363d]'}`}></div>
                  ))}
                </div>
             </div>
           )}
        </div>

        {/* KB Selection Modal */}
        {isConfigOpen && (
          <div className="absolute top-16 left-8 z-50 w-96 bg-white dark:bg-[#1c2128] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center pb-2 border-b border-[#f0f2f4] dark:border-[#30363d]">
                <h4 className="font-bold text-sm">查询知识库授权集</h4>
                <button onClick={() => setIsConfigOpen(false)} className="text-[#8b949e] hover:text-[#24292f]">✕</button>
             </div>
             <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {authorizedKBs.map(kb => (
                  <label key={kb.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${retrievalConfig.selected_kb_ids.includes(kb.id) ? 'border-[#0366d6] bg-[#0366d6]/5' : 'border-transparent hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]'}`}>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{kb.name}</span>
                      <span className={`text-[9px] font-black uppercase mt-0.5 ${kb.clearance === '机密' ? 'text-red-500' : 'text-green-500'}`}>{kb.clearance}</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={retrievalConfig.selected_kb_ids.includes(kb.id)}
                      onChange={(e) => {
                        const newIds = e.target.checked 
                          ? [...retrievalConfig.selected_kb_ids, kb.id]
                          : retrievalConfig.selected_kb_ids.filter(id => id !== kb.id);
                        setRetrievalConfig({...retrievalConfig, selected_kb_ids: newIds});
                      }}
                      className="w-4 h-4 rounded border-[#d0d7de] text-[#0366d6] focus:ring-[#0366d6]"
                    />
                  </label>
                ))}
             </div>
             <button onClick={() => setIsConfigOpen(false)} className="w-full py-2.5 bg-[#0366d6] text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all">保存配置并关闭</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {!response && !isSearching && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
               <div className="w-24 h-24 mb-6 text-[#d0d7de] dark:text-[#30363d]">
                  <Icons.Search />
               </div>
               <p className="font-bold text-base tracking-[0.2em] text-[#8b949e] uppercase">Enterprise Intelligence Suite</p>
               <p className="text-xs mt-3 text-[#afb8c1] font-medium italic">输入武器研制或装备属性查询指令...</p>
            </div>
          )}

          {response && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#2da44e]">
                <div className="px-6 py-4 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-[#8b949e] uppercase tracking-tighter">判定密级</span>
                        <span className={`text-[11px] font-black uppercase ${
                          response.security_badge === '机密' ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {response.security_badge}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-[#d0d7de] dark:bg-[#30363d]"></div>
                      {response.is_desensitized && (
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black text-[#8b949e] uppercase tracking-tighter">合规治理</span>
                            <span className="text-[11px] text-[#57606a] font-bold flex items-center gap-1">
                               <Icons.Lock /> 自动脱敏已生效
                            </span>
                         </div>
                      )}
                   </div>
                   <button onClick={shareResponse} className="p-2 hover:bg-[#eaeef2] dark:hover:bg-[#21262d] rounded-xl transition-all active:scale-90 text-[#57606a]" title="加密分享">
                      <Icons.Share />
                   </button>
                </div>

                <div className="p-10 leading-[2.2] text-[16px] dark:text-[#c9d1d9] selection:bg-blue-100 dark:selection:bg-blue-900/40">
                   {response.answer}
                </div>
              </div>

              {/* Thought Process Chain */}
              <div className="pl-6 border-l-2 border-[#d0d7de] dark:border-[#30363d] space-y-6">
                 <h5 className="text-[10px] font-black text-[#8b949e] uppercase tracking-[0.3em] mb-4">推理与安全校验链</h5>
                 {response.thought_process.map((step, idx) => (
                   <div key={idx} className="relative group">
                      <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-white dark:bg-[#0d1117] border-2 border-[#0366d6] group-hover:scale-125 transition-transform"></div>
                      <p className="text-[10px] font-black text-[#57606a] dark:text-[#8b949e] uppercase">{step.title}</p>
                      <p className="text-xs text-[#24292f] dark:text-[#c9d1d9] mt-1 font-medium">{step.content}</p>
                   </div>
                 ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Terminal */}
        <div className="p-8 bg-white dark:bg-[#0d1117] border-t border-[#d0d7de] dark:border-[#30363d] z-20">
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto space-y-4">
            <div className="relative group bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-2xl focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-[#0366d6] transition-all shadow-sm">
              <textarea 
                rows={1}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSearch(e)}
                placeholder="在此输入您的业务指令... (如：某型坦克的实弹测试数据异常分析)"
                className="w-full bg-transparent border-none rounded-2xl py-5 px-6 pr-32 text-sm focus:outline-none resize-none leading-relaxed"
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-3">
                 <button 
                  type="submit"
                  disabled={isSearching}
                  className="bg-[#0366d6] dark:bg-[#1f6feb] text-white px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all font-bold text-xs shadow-xl shadow-blue-500/10 active:scale-95 flex items-center gap-2"
                 >
                   {isSearching ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "发送指令"}
                 </button>
              </div>
            </div>
            <div className="flex justify-between px-2">
              <div className="flex gap-4">
                <span className="text-[9px] text-[#8b949e] font-black uppercase tracking-widest flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> 审计状态: <span className="text-green-500">ACTIVE</span>
                </span>
                <span className="text-[9px] text-[#8b949e] font-black uppercase tracking-widest flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> 终端密级: <span className="text-red-500">{currentUser.clearance}</span>
                </span>
              </div>
              <span className="text-[9px] text-[#8b949e] font-mono">NODE-HS-9281-QC</span>
            </div>
          </form>
        </div>
      </div>

      <EvidencePanel 
        provenance={response?.provenance || []} 
      />
    </div>
  );
};

export default QAView;
