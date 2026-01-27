
import React, { useState } from 'react';
import { performQA } from '../services/geminiService';
import { QAResponse } from '../types';
import EvidencePanel from './EvidencePanel';
import { Icons } from '../constants';

const QAView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'hybrid' | 'vector'>('hybrid');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResponse(null);
    try {
      const res = await performQA(query);
      setResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#c9d1d9] transition-colors duration-200">
      <div className="flex-1 flex flex-col h-full bg-[#f6f8fa]/40 dark:bg-[#0d1117]">
        {/* 搜索区域 */}
        <div className="p-8 border-b border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#0d1117]">
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#24292f] dark:text-[#f0f6fc]">高级战术智能问答</h2>
                  <span className="text-[10px] font-mono bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] px-1.5 py-0.5 rounded text-[#57606a] dark:text-[#8b949e]">V2.4-STABLE</span>
               </div>
               <div className="flex bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-1 rounded-md">
                  <button 
                    type="button"
                    onClick={() => setSearchMode('hybrid')}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${searchMode === 'hybrid' ? 'bg-white dark:bg-[#30363d] border-[#d0d7de] dark:border-[#484f58] shadow-sm font-bold text-[#0366d6] dark:text-[#58a6ff]' : 'text-[#57606a] dark:text-[#8b949e]'}`}
                  >
                    混合检索
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSearchMode('vector')}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${searchMode === 'vector' ? 'bg-white dark:bg-[#30363d] border-[#d0d7de] dark:border-[#484f58] shadow-sm font-bold text-[#0366d6] dark:text-[#58a6ff]' : 'text-[#57606a] dark:text-[#8b949e]'}`}
                  >
                    向量检索
                  </button>
               </div>
            </div>
            
            <div className="relative">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入战术咨询或情报查询指令 (例如: '分析DF-26导弹的打击范围与部署特征')" 
                className="w-full bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] text-[#24292f] dark:text-[#c9d1d9] rounded-md py-3 pl-4 pr-14 shadow-sm focus:outline-none focus:border-[#0366d6] dark:focus:border-[#1f6feb] focus:ring-4 focus:ring-[rgba(3,102,214,0.1)] dark:focus:ring-[rgba(31,111,235,0.1)] transition-all text-sm"
              />
              <button 
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#0366d6] dark:bg-[#238636] text-white px-4 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50 transition-colors font-semibold text-xs"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  "检索"
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-6 text-[11px] text-[#57606a] dark:text-[#8b949e] font-medium">
              <span className="flex items-center gap-1"><Icons.Lock /> 检索范围:</span>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#0366d6] dark:hover:text-[#58a6ff]">
                <input type="checkbox" className="rounded border-[#d0d7de] dark:border-[#30363d] bg-transparent text-[#0366d6] dark:text-[#1f6feb]" defaultChecked />
                <span>内部规章</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#0366d6] dark:hover:text-[#58a6ff]">
                <input type="checkbox" className="rounded border-[#d0d7de] dark:border-[#30363d] bg-transparent text-[#0366d6] dark:text-[#1f6feb]" defaultChecked />
                <span>情报简报</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#0366d6] dark:hover:text-[#58a6ff]">
                <input type="checkbox" className="rounded border-[#d0d7de] dark:border-[#30363d] bg-transparent text-[#0366d6] dark:text-[#1f6feb]" />
                <span>公开开源</span>
              </label>
            </div>
          </form>
        </div>

        {/* 结果区域 */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {!response && !isLoading && (
              <div className="flex flex-col items-center justify-center py-24 text-[#afb8c1] dark:text-[#484f58]">
                <div className="w-16 h-16 mb-4 opacity-30">
                  <Icons.Database />
                </div>
                <p className="font-semibold text-sm">等待指令输入...</p>
                <p className="text-xs mt-1">系统已加载 14,293 份核心文档索引</p>
              </div>
            )}

            {isLoading && (
              <div className="space-y-6">
                <div className="h-4 bg-[#eaeef2] dark:bg-[#161b22] rounded-full w-3/4 animate-pulse"></div>
                <div className="h-4 bg-[#eaeef2] dark:bg-[#161b22] rounded-full w-full animate-pulse"></div>
                <div className="h-4 bg-[#eaeef2] dark:bg-[#161b22] rounded-full w-5/6 animate-pulse"></div>
              </div>
            )}

            {response && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-md shadow-sm overflow-hidden transition-colors duration-200">
                  <div className="px-5 py-3 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <span className="text-[11px] font-bold text-[#57606a] dark:text-[#8b949e] tracking-widest">智能分析结果</span>
                       <span className="text-[10px] bg-[#dafbe1] dark:bg-[rgba(63,185,80,0.1)] text-[#1a7f37] dark:text-[#3fb950] px-2 py-0.5 rounded-full border border-[#2da44e]/20 dark:border-[rgba(63,185,80,0.2)] font-bold">置信度: {(response.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-[10px] text-[#57606a] dark:text-[#8b949e] font-mono">
                      内核: {response.meta.model} | 响应: {response.meta.latency}
                    </div>
                  </div>
                  
                  <div className="p-8 leading-8 text-[#24292f] dark:text-[#c9d1d9] text-[15px]">
                    {response.answer.split('.').map((sentence, idx) => {
                      if (!sentence.trim()) return null;
                      const sId = `s${idx + 1}`;
                      const hasProv = response.provenance.some(p => p.sentence_id === sId);
                      return (
                        <span 
                          key={idx}
                          onMouseEnter={() => hasProv && setActiveSentenceId(sId)}
                          onMouseLeave={() => setActiveSentenceId(null)}
                          className={`inline transition-all duration-200 ${
                            hasProv ? 'border-b-2 border-[#0366d6]/30 dark:border-[#58a6ff]/30 cursor-help hover:bg-[#0366d6]/5 dark:hover:bg-[#58a6ff]/10' : ''
                          } ${activeSentenceId === sId ? 'bg-[#0366d6]/10 dark:bg-[#58a6ff]/20 border-[#0366d6] dark:border-[#58a6ff]' : ''}`}
                        >
                          {sentence.trim()}{sentence.endsWith('。') ? '' : '。'}
                        </span>
                      );
                    })}
                  </div>
                  
                  <div className="px-6 py-4 bg-[#fcfcfc] dark:bg-[#161b22] border-t border-[#f0f2f4] dark:border-[#30363d] flex justify-between items-center">
                    <div className="flex gap-2">
                       <button className="text-[11px] font-bold px-3 py-1.5 border border-[#d0d7de] dark:border-[#30363d] rounded-md bg-white dark:bg-[#21262d] text-[#24292f] dark:text-[#c9d1d9] hover:bg-[#f3f4f6] dark:hover:bg-[#30363d] flex items-center gap-2">
                         <Icons.Lock /> 查看审计记录
                       </button>
                       <button className="text-[11px] font-bold px-3 py-1.5 border border-[#d0d7de] dark:border-[#30363d] rounded-md bg-white dark:bg-[#21262d] text-[#24292f] dark:text-[#c9d1d9] hover:bg-[#f3f4f6] dark:hover:bg-[#30363d]">
                         导出战术简报
                       </button>
                    </div>
                    <div className="text-[10px] text-[#57606a] dark:text-[#8b949e] italic">
                      本回答由智能引擎生成，仅供战术决策参考
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="border border-[#d0d7de] dark:border-[#30363d] rounded-md p-5 bg-white dark:bg-[#0d1117]">
                    <h4 className="text-xs font-bold text-[#57606a] dark:text-[#8b949e] uppercase mb-4 tracking-wider flex items-center gap-2">
                      <div className="w-1 h-3 bg-[#0366d6] dark:bg-[#58a6ff] rounded-full"></div> 推荐后续操作
                    </h4>
                    <div className="space-y-3">
                      <button className="w-full text-left px-3 py-2 text-xs text-[#0366d6] dark:text-[#58a6ff] hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] rounded-md border border-transparent hover:border-[#d0d7de] dark:hover:border-[#30363d] flex items-center justify-between group transition-all">
                        <span>关联最近 72 小时卫星图传</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </button>
                      <button className="w-full text-left px-3 py-2 text-xs text-[#0366d6] dark:text-[#58a6ff] hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] rounded-md border border-transparent hover:border-[#d0d7de] dark:hover:border-[#30363d] flex items-center justify-between group transition-all">
                        <span>在三维地图中定位目标点</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </button>
                    </div>
                  </div>
                  <div className="border border-[#d0d7de] dark:border-[#30363d] rounded-md p-5 bg-white dark:bg-[#0d1117]">
                    <h4 className="text-xs font-bold text-[#57606a] dark:text-[#8b949e] uppercase mb-4 tracking-wider flex items-center gap-2">
                      <div className="w-1 h-3 bg-[#1a7f37] dark:bg-[#3fb950] rounded-full"></div> 合规性审查 (Auditor)
                    </h4>
                    <p className="text-xs text-[#57606a] dark:text-[#8b949e] mb-4">当前回答经过 DLP (数据泄露防护) 扫描，未发现敏感实体外溢。</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#1a7f37] dark:text-[#3fb950] bg-[#dafbe1] dark:bg-[rgba(63,185,80,0.1)] px-2 py-1.5 rounded-md border border-[#2da44e]/20 dark:border-[rgba(63,185,80,0.2)]">
                      <Icons.Lock /> 扫描通过：符合 {searchMode === 'hybrid' ? '机密级' : '内部级'} 输出规范
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <EvidencePanel 
        provenance={response?.provenance || []} 
        activeId={activeSentenceId || undefined}
        onEvidenceClick={(p) => setActiveSentenceId(p.sentence_id)}
      />
    </div>
  );
};

export default QAView;
