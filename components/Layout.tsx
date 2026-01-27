
import React, { useState } from 'react';
import { Icons, COLORS } from '../constants';
import { ClearanceLevel } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, theme, onToggleTheme }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'qa', label: '战术问答', icon: <Icons.Search /> },
    { id: 'kg', label: '知识图谱', icon: <Icons.Network /> },
    { id: 'docs', label: '文档库', icon: <Icons.File /> },
    { id: 'analytics', label: '效能分析', icon: <Icons.Activity /> },
    { id: 'admin', label: '系统管理', icon: <Icons.Lock /> },
  ];

  return (
    <div className="flex h-screen bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#c9d1d9] transition-colors duration-200">
      {/* 侧边栏 */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-16'} border-r border-[#d0d7de] dark:border-[#30363d] bg-[#f6f8fa] dark:bg-[#161b22] flex flex-col transition-all duration-200 ease-in-out`}>
        <div className="p-4 flex items-center gap-3 border-b border-[#d0d7de] dark:border-[#30363d] h-14">
          <div className="bg-[#0366d6] dark:bg-[#1f6feb] text-white p-1.5 rounded-md flex-shrink-0 shadow-sm">
             <Icons.Database />
          </div>
          {isSidebarOpen && <span className="font-bold text-sm truncate tracking-tight text-[#24292f] dark:text-[#f0f6fc]">军事智能平台</span>}
        </div>
        
        <nav className="flex-1 mt-4 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === item.id 
                  ? 'bg-[#d0d7de] dark:bg-[#30363d] text-[#24292f] dark:text-[#f0f6fc] font-semibold' 
                  : 'text-[#57606a] dark:text-[#8b949e] hover:bg-[#eaeef2] dark:hover:bg-[#21262d] hover:text-[#24292f] dark:hover:text-[#c9d1d9]'
              }`}
            >
              <span className={activeTab === item.id ? 'text-[#0366d6] dark:text-[#58a6ff]' : ''}>{item.icon}</span>
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#d0d7de] dark:border-[#30363d] bg-[#f6f8fa] dark:bg-[#161b22]">
          <div className={`flex items-center gap-3 ${isSidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-[#d0d7de] dark:bg-[#30363d] border border-[#afb8c1] dark:border-[#484f58] flex items-center justify-center font-bold text-xs text-[#24292f] dark:text-[#c9d1d9]">
              陆
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#24292f] dark:text-[#f0f6fc] truncate">分析员：张建国</span>
                <span className="text-[10px] text-[#1a7f37] dark:text-[#3fb950] font-bold uppercase tracking-wider flex items-center gap-1">
                   <div className="w-1.5 h-1.5 bg-green-500 dark:bg-[#3fb950] rounded-full"></div>
                   {ClearanceLevel.SECRET}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶栏 */}
        <header className="h-14 border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between px-4 bg-white dark:bg-[#0d1117] z-10 transition-colors duration-200">
          <div className="flex items-center gap-4 flex-1">
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
               className="p-1.5 text-[#57606a] dark:text-[#8b949e] hover:bg-[#f6f8fa] dark:hover:bg-[#30363d] hover:text-[#24292f] dark:hover:text-[#c9d1d9] rounded-md border border-transparent transition-all"
             >
                <Icons.Menu />
             </button>
             <div className="relative w-full max-w-xl">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#57606a] dark:text-[#8b949e]">
                  <Icons.Search />
                </span>
                <input 
                  type="text" 
                  placeholder="全局检索指令 (Ctrl + K)" 
                  className="w-full bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] text-[#24292f] dark:text-[#c9d1d9] rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-[#0366d6] dark:focus:border-[#1f6feb] focus:ring-2 focus:ring-[rgba(3,102,214,0.15)] dark:focus:ring-[rgba(31,111,235,0.2)] transition-all"
                />
             </div>
          </div>
          
          <div className="flex items-center gap-4 ml-4">
             {/* 主题切换按钮 */}
             <button 
               onClick={onToggleTheme}
               className="p-2 rounded-md border border-[#d0d7de] dark:border-[#30363d] hover:bg-[#f6f8fa] dark:hover:bg-[#30363d] transition-all text-[#57606a] dark:text-[#8b949e]"
               title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
             >
               {theme === 'light' ? (
                 <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9.598 1.591a.75.75 0 0 1 .785-.175 7 7 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.5 5.5 0 1 0 7.678-7.678Z"></path></svg>
               ) : (
                 <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.657-8.157a.75.75 0 0 1 0 1.06l-1.061 1.061a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.061 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Zm9.193 0a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 1 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061ZM3.525 3.525a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 1 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061ZM16 8a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm5 5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13Zm0-10a.75.75 0 0 1-.75-.75v-1.5a.75.75 0 0 1 1.5 0v1.5A.75.75 0 0 1 8 3Z"></path></svg>
               )}
             </button>

             <div className="flex items-center gap-1.5 bg-[#fff8c5] dark:bg-[rgba(187,128,9,0.15)] border border-[#d4a72c] dark:border-[rgba(187,128,9,0.4)] px-2 py-1 rounded-md">
                <span className="text-[#735c0f] dark:text-[#d29922]"><Icons.Lock /></span>
                <span className="text-[10px] font-bold text-[#735c0f] dark:text-[#d29922]">战术加密链</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#57606a] dark:text-[#8b949e]">实时状态:</span>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 dark:bg-[#3fb950] shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-white dark:bg-[#0d1117] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
