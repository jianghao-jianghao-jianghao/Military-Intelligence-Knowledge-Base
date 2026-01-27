
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import QAView from './components/QAView.tsx';
import KnowledgeGraph from './components/KnowledgeGraph.tsx';
import { Icons } from './constants.tsx';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('qa');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'qa':
        return <QAView />;
      case 'kg':
        return <KnowledgeGraph />;
      case 'docs':
        return (
          <div className="p-10 max-w-6xl mx-auto text-[#24292f] dark:text-[#c9d1d9]">
            <div className="flex justify-between items-end mb-8">
               <div>
                  <h2 className="text-2xl font-bold text-[#24292f] dark:text-[#f0f6fc]">战术文档库</h2>
                  <p className="text-sm text-[#57606a] dark:text-[#8b949e] mt-1">管理并处理所有结构化与非结构化情报文档</p>
               </div>
               <button className="bg-[#2da44e] dark:bg-[#238636] text-white px-4 py-2 rounded-md text-sm font-bold hover:opacity-90 transition-colors flex items-center gap-2">
                 <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path></svg>
                 上传新文档
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="border border-[#d0d7de] dark:border-[#30363d] p-5 rounded-md bg-white dark:bg-[#0d1117] hover:border-[#0366d6] dark:hover:border-[#58a6ff] hover:shadow-md dark:hover:shadow-2xl transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-[#f6f8fa] dark:bg-[#161b22] p-2.5 rounded-md border border-[#d0d7de] dark:border-[#30363d] text-[#0366d6] dark:text-[#58a6ff]">
                      <Icons.File />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] text-[#57606a] dark:text-[#8b949e]">PDF / 绝密</span>
                  </div>
                  <h3 className="font-bold text-[14px] text-[#24292f] dark:text-[#f0f6fc] truncate mb-1">战术报告_2024_修订版_{i}.pdf</h3>
                  <p className="text-[11px] text-[#57606a] dark:text-[#8b949e]">2 小时前由 AI 引擎自动解析</p>
                  <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="flex-1 text-[11px] font-bold py-1.5 border border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#21262d] text-[#24292f] dark:text-[#c9d1d9] rounded-md hover:bg-[#f6f8fa] dark:hover:bg-[#30363d]">预览</button>
                    <button className="flex-1 text-[11px] font-bold py-1.5 bg-[#0366d6] dark:bg-[#1f6feb] text-white rounded-md hover:opacity-90">重解析</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="p-10 max-w-6xl mx-auto text-[#24292f] dark:text-[#c9d1d9]">
             <h2 className="text-2xl font-bold text-[#24292f] dark:text-[#f0f6fc] mb-8">情报流效能统计</h2>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {[
                  { label: '实体总量', value: '45.2k', change: '+12%', color: 'text-[#0366d6] dark:text-[#58a6ff]' },
                  { label: '日均查询', value: '1.2k', change: '+5%', color: 'text-[#24292f] dark:text-[#f0f6fc]' },
                  { label: '入库速率', value: '85 MB/s', change: '-2%', color: 'text-[#cf222e] dark:text-[#f85149]' },
                  { label: '索引健康度', value: '99.9%', change: '稳定', color: 'text-[#1a7f37] dark:text-[#3fb950]' },
                ].map((stat, i) => (
                  <div key={i} className="border border-[#d0d7de] dark:border-[#30363d] p-5 rounded-md bg-white dark:bg-[#0d1117]">
                    <p className="text-[10px] font-black text-[#57606a] dark:text-[#8b949e] uppercase tracking-widest">{stat.label}</p>
                    <div className="flex items-end gap-2 mt-2">
                      <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                      <span className={`text-[11px] font-bold ${stat.change.startsWith('+') || stat.change === '稳定' ? 'text-[#1a7f37] dark:text-[#3fb950]' : 'text-[#cf222e] dark:text-[#f85149]'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
             </div>
             <div className="border border-[#d0d7de] dark:border-[#30363d] rounded-md bg-white dark:bg-[#0d1117] p-6 shadow-sm dark:shadow-xl">
                <div className="flex justify-between items-center mb-6">
                   <p className="text-xs font-bold text-[#24292f] dark:text-[#f0f6fc]">数据摄入延迟 (24h 波动图)</p>
                   <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#57606a] dark:text-[#8b949e]">
                        <div className="w-2 h-2 bg-[#0366d6] dark:bg-[#1f6feb] rounded-sm"></div> 摄入量
                      </div>
                   </div>
                </div>
                <div className="flex h-56 items-end gap-1.5 pb-2">
                   {[...Array(30)].map((_, i) => (
                     <div key={i} className="flex-1 bg-[#0366d6] dark:bg-[#1f6feb] rounded-t-sm hover:opacity-100 transition-colors" style={{ height: `${Math.random() * 70 + 20}%`, opacity: theme === 'dark' ? 0.7 : 0.9 }}></div>
                   ))}
                </div>
                <div className="border-t border-[#f0f2f4] dark:border-[#30363d] mt-2 pt-2 flex justify-between text-[10px] text-[#afb8c1] dark:text-[#484f58] font-mono">
                   <span>T-24h</span>
                   <span>T-12h</span>
                   <span>现在</span>
                </div>
             </div>
          </div>
        );
      case 'admin':
        return (
          <div className="p-10 max-w-4xl mx-auto text-[#24292f] dark:text-[#c9d1d9]">
             <div className="mb-8">
               <h2 className="text-2xl font-bold text-[#24292f] dark:text-[#f0f6fc]">系统安全与治理</h2>
               <p className="text-sm text-[#57606a] dark:text-[#8b949e] mt-1">配置全局访问权限、密级策略及加密参数</p>
             </div>
             
             <div className="space-y-8">
               <div className="border border-[#d0d7de] dark:border-[#30363d] rounded-md overflow-hidden bg-white dark:bg-[#161b22] shadow-sm dark:shadow-2xl">
                 <div className="px-5 py-3 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center">
                    <h3 className="font-bold text-sm text-[#24292f] dark:text-[#f0f6fc]">访问控制列表 (ACL)</h3>
                    <button className="text-[11px] font-bold text-[#0366d6] dark:text-[#58a6ff] hover:underline">新增角色</button>
                 </div>
                 <div className="divide-y divide-[#f0f2f4] dark:divide-[#30363d]">
                    {[
                      { role: '高级情报分析官', clearance: '绝密', members: 12 },
                      { role: '战地情报员', clearance: '机密', members: 45 },
                      { role: '系统运维工程师', clearance: '内部公开', members: 8 },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between p-5 hover:bg-[#fcfcfc] dark:hover:bg-[#1c2128]">
                         <div>
                            <p className="font-bold text-sm text-[#24292f] dark:text-[#f0f6fc]">{row.role}</p>
                            <p className="text-xs text-[#57606a] dark:text-[#8b949e] mt-0.5">{row.members} 个活跃会话</p>
                         </div>
                         <div className="flex items-center gap-6">
                            <span className="text-[10px] font-bold bg-[#f6f8fa] dark:bg-[#21262d] text-[#24292f] dark:text-[#c9d1d9] px-2 py-1 rounded-md border border-[#d0d7de] dark:border-[#30363d]">{row.clearance}</span>
                            <button className="text-[11px] font-bold text-[#0366d6] dark:text-[#58a6ff] hover:underline">权限配置</button>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-[#d0d7de] dark:border-[#30363d] p-6 rounded-md bg-white dark:bg-[#161b22]">
                    <h3 className="font-bold text-sm text-[#24292f] dark:text-[#f0f6fc] mb-2">审计日志脱敏策略</h3>
                    <p className="text-xs text-[#57606a] dark:text-[#8b949e] mb-5">当前已启用句子级实体自动遮蔽，所有外发报告将进行二次脱敏处理。</p>
                    <button className="text-xs font-bold text-[#cf222e] dark:text-[#f85149] border border-[#d0d7de] dark:border-[#30363d] px-4 py-2 rounded-md hover:bg-red-50 dark:hover:bg-[#161b22] transition-colors">强制立即轮转密钥</button>
                  </div>
                  <div className="border border-[#d0d7de] dark:border-[#30363d] p-6 rounded-md bg-white dark:bg-[#161b22]">
                    <h3 className="font-bold text-sm text-[#24292f] dark:text-[#f0f6fc] mb-2">硬件加密模块 (HSM)</h3>
                    <p className="text-xs text-[#57606a] dark:text-[#8b949e] mb-5">当前使用国密 SM4 硬件加速算法。TPM 2.0 状态：正常。</p>
                    <div className="flex items-center gap-2 text-[#1a7f37] dark:text-[#3fb950] font-bold text-xs uppercase bg-[#dafbe1] dark:bg-[rgba(63,185,80,0.1)] px-3 py-1.5 rounded-md border border-[#2da44e]/10 dark:border-[rgba(63,185,80,0.2)] inline-flex">
                       <div className="w-2 h-2 bg-[#1a7f37] dark:bg-[#3fb950] rounded-full"></div>
                       已通过合规性认证
                    </div>
                  </div>
               </div>
             </div>
          </div>
        );
      default:
        return <div className="p-10 text-[#57606a] dark:text-[#8b949e]">模块正在开发中...</div>;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
