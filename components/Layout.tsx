
import React, { useState } from 'react';
import { Icons } from '../constants.tsx';
import { ClearanceLevel, UserRole, User } from '../types.ts';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  currentUser: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, theme, onToggleTheme, currentUser, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navItems = [
    { id: 'qa', label: '安全智能问答', icon: <Icons.Search />, roles: [UserRole.USER, UserRole.KB_MANAGER, UserRole.SUPER_ADMIN] },
    { id: 'kg', label: '装备知识图谱', icon: <Icons.Network />, roles: [UserRole.USER, UserRole.KB_MANAGER, UserRole.SUPER_ADMIN] },
    { id: 'docs', label: '武器技术档案', icon: <Icons.File />, roles: [UserRole.USER, UserRole.KB_MANAGER, UserRole.SUPER_ADMIN] },
    { id: 'doc_proc', label: '智能文档工坊', icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z"></path><path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z"></path></svg>
    ), roles: [UserRole.USER, UserRole.KB_MANAGER, UserRole.SUPER_ADMIN] },
    { id: 'admin', label: '后台管理中心', icon: <Icons.Lock />, roles: [UserRole.KB_MANAGER, UserRole.SUPER_ADMIN] },
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="flex h-screen bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#c9d1d9] transition-colors duration-200 overflow-hidden font-sans">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-16'} border-r border-[#d0d7de] dark:border-[#30363d] bg-[#f6f8fa] dark:bg-[#161b22] flex flex-col transition-all duration-200`}>
        <div className="p-4 flex items-center gap-3 border-b border-[#d0d7de] dark:border-[#30363d] h-14 overflow-hidden">
          <div className="bg-[#0366d6] dark:bg-[#1f6feb] text-white p-1.5 rounded-md flex-shrink-0">
             <Icons.Database />
          </div>
          {isSidebarOpen && <span className="font-bold text-sm truncate text-[#24292f] dark:text-[#f0f6fc] tracking-tight">兵工研制大脑</span>}
        </div>
        
        <nav className="flex-1 mt-4 px-2 space-y-1">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === item.id 
                  ? 'bg-[#d0d7de] dark:bg-[#30363d] text-[#24292f] dark:text-[#f0f6fc] font-semibold' 
                  : 'text-[#57606a] dark:text-[#8b949e] hover:bg-[#eaeef2] dark:hover:bg-[#21262d]'
              }`}
            >
              <span className={activeTab === item.id ? 'text-[#0366d6] dark:text-[#58a6ff]' : ''}>{item.icon}</span>
              {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-[#d0d7de] dark:border-[#30363d] relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#eaeef2] dark:hover:bg-[#21262d] transition-colors ${!isSidebarOpen && 'justify-center'}`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0366d6] to-[#58a6ff] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
              {currentUser.name.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-bold truncate">{currentUser.name}</span>
                <span className="text-[9px] text-[#1a7f37] dark:text-[#3fb950] font-bold uppercase tracking-widest">{currentUser.clearance}</span>
              </div>
            )}
          </button>

          {isProfileOpen && isSidebarOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-[#1c2128] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-2xl p-1 z-50">
               <div className="px-3 py-2 border-b border-[#f0f2f4] dark:border-[#30363d] mb-1">
                  <p className="text-[10px] font-bold text-[#57606a] dark:text-[#8b949e] uppercase">身份标识</p>
                  <p className="text-[11px] font-bold mt-1">ID: {currentUser.username}</p>
               </div>
               <button onClick={onToggleTheme} className="w-full text-left px-3 py-2 text-xs hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] rounded-md transition-colors flex items-center gap-2">
                 <span>{theme === 'light' ? '🌙' : '☀️'}</span> 切换主题
               </button>
               <button onClick={onLogout} className="w-full text-left px-3 py-2 text-xs hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] rounded-md text-red-500 transition-colors flex items-center gap-2">
                 <span>🚪</span> 安全登出系统
               </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between px-4 bg-white dark:bg-[#0d1117] z-10">
          <div className="flex items-center gap-4 flex-1">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 text-[#57606a] dark:text-[#8b949e] hover:bg-[#f6f8fa] dark:hover:bg-[#30363d] rounded-md">
                <Icons.Menu />
             </button>
             <div className="flex items-center gap-3">
               <span className="text-sm font-bold tracking-tight">
                 {activeTab === 'qa' ? '安全智能检索' : activeTab === 'admin' ? '研制治理后台' : activeTab === 'doc_proc' ? '智能文档工坊' : '武器数据服务'}
               </span>
               <div className="h-4 w-px bg-[#d0d7de] dark:bg-[#30363d]"></div>
               <div className="flex items-center gap-1.5 bg-green-100 dark:bg-green-900/20 px-2 py-0.5 rounded border border-green-500/20">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-bold text-green-700 dark:text-green-400">研制专网已连接</span>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 border border-[#d0d7de] dark:border-[#30363d] px-2 py-1 rounded-md bg-[#f6f8fa] dark:bg-[#1c2128]">
                <Icons.Lock />
                <span className="text-[10px] font-bold text-[#57606a] dark:text-[#8b949e]">访问控制: 已启动</span>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#ffffff] dark:bg-[#0d1117]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
