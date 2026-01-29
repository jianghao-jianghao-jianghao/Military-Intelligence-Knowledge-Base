
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import QAView from './components/QAView.tsx';
import KnowledgeGraph from './components/KnowledgeGraph.tsx';
import AdminView from './components/AdminView.tsx';
import AuthView from './components/AuthView.tsx';
import DocProcessingView from './components/DocProcessingView.tsx';
import { Icons, MOCK_KBS, MOCK_DOCS } from './constants.tsx';
import { User, ClearanceLevel, WeaponDocument } from './types.ts';
import { ApiService } from './services/api.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('qa');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewingDoc, setViewingDoc] = useState<WeaponDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleOpenDocument = async (docId: string) => {
      // Use the service to fetch doc
      const res = await ApiService.getDocumentById(docId);
      if (res.data) {
          setViewingDoc(res.data);
      } else {
          alert(`文档 (ID: ${docId}) 不存在或权限不足`);
      }
  };

  if (!currentUser) {
    return <AuthView onLogin={setCurrentUser} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'qa':
        return <QAView currentUser={currentUser} onOpenDocument={handleOpenDocument} />;
      case 'kg':
        return <KnowledgeGraph />;
      case 'admin':
        return <AdminView />;
      case 'doc_proc':
        return <DocProcessingView />;
      case 'docs':
        // Fixed property names: authorized_roles exists now, department_id -> departmentId
        const authorizedKBs = MOCK_KBS.filter(kb => 
          kb.authorized_roles.includes(currentUser.role) || 
          kb.authorized_departments.includes(currentUser.departmentId)
        );
        
        return (
          <div className="p-10 max-w-6xl mx-auto animate-in fade-in duration-300">
            <div className="flex justify-between items-end mb-10 border-b border-[#d0d7de] dark:border-[#30363d] pb-6">
               <div>
                  <h2 className="text-2xl font-bold">武器技术档案中心</h2>
                  <p className="text-sm text-[#57606a] mt-1">企业级多库联合档案管理架构</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => setIsUploading(true)} className="bg-[#2da44e] text-white px-4 py-2 rounded-md text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">
                   <Icons.Upload /> 上传技术档案
                 </button>
               </div>
            </div>
            
            <div className="space-y-12">
               {authorizedKBs.map(kb => {
                 const kbDocs = MOCK_DOCS.filter(d => d.kb_id === kb.id);
                 return (
                   <div key={kb.id} className="space-y-4">
                      <div className="flex items-center gap-3 pb-2 border-b border-[#d0d7de] dark:border-[#30363d]/50">
                        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm">
                          <Icons.Database />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{kb.name}</h3>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#8b949e]">密级权限: {kb.clearance}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {kbDocs.length > 0 ? kbDocs.map(doc => (
                          <div key={doc.id} onClick={() => setViewingDoc(doc)} className="border border-[#d0d7de] dark:border-[#30363d] p-5 rounded-md bg-white dark:bg-[#161b22] hover:border-blue-500 transition-all group cursor-pointer shadow-sm hover:shadow-xl">
                            <div className="flex justify-between items-start mb-4">
                              <div className="bg-[#f6f8fa] dark:bg-[#0d1117] p-2.5 rounded-md border border-[#d0d7de] dark:border-[#30363d] text-[#0366d6] group-hover:scale-110 transition-transform">
                                <Icons.File />
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                doc.clearance === ClearanceLevel.SECRET ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                              }`}>
                                {doc.clearance}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm truncate group-hover:text-[#0366d6] transition-colors">{doc.title}</h3>
                            <p className="text-[11px] text-[#57606a] mt-2 font-mono">ID: {doc.id} | 更新: {doc.last_updated}</p>
                            <div className="mt-6 flex gap-2">
                              <button className="flex-1 py-1.5 text-xs font-bold border border-[#d0d7de] dark:border-[#30363d] rounded hover:bg-[#f6f8fa] dark:hover:bg-[#21262d]">调阅详情</button>
                            </div>
                          </div>
                        )) : (
                          <p className="text-xs text-[#8b949e] italic">该库内暂无关联档案</p>
                        )}
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>
        );
      default:
        return <div className="p-10 text-center">正在接入子系统...</div>;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      theme={theme}
      onToggleTheme={toggleTheme}
      currentUser={currentUser}
      onLogout={() => setCurrentUser(null)}
    >
      {renderContent()}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-10 animate-in fade-in duration-200">
           <div className="bg-[#0d1117] border border-[#30363d] w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-[#30363d] flex justify-between items-center bg-[#161b22]">
                 <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-600 rounded text-white"><Icons.File /></div>
                    <div>
                       <h3 className="font-bold text-lg">{viewingDoc.title}</h3>
                       <p className="text-xs text-[#8b949e]">密级: {viewingDoc.clearance} | 资源标识码: {viewingDoc.id}</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingDoc(null)} className="text-[#8b949e] hover:text-white p-2 text-2xl transition-colors">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 text-[#c9d1d9] leading-[2] font-serif bg-white/[0.02]">
                 <div className="max-w-3xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8 text-white border-b border-[#30363d] pb-6">{viewingDoc.title}</h1>
                    <div className="space-y-6 text-lg">
                       {viewingDoc.content_preview ? viewingDoc.content_preview.split('\n').map((p, i) => (
                         <p key={i}>{p}</p>
                       )) : (
                         <div className="h-64 flex flex-col items-center justify-center opacity-40">
                            <Icons.Lock />
                            <p className="mt-4 italic">暂无内容预览，请申请物理调阅</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
              <div className="p-4 border-t border-[#30363d] bg-[#161b22] flex justify-between items-center px-10">
                 <div className="flex gap-4">
                    <button className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded text-xs font-bold hover:bg-[#30363d]">下载脱敏副本</button>
                    <button className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded text-xs font-bold hover:bg-[#30363d]">打印申请</button>
                 </div>
                 <div className="text-[10px] text-[#57606a] font-mono">
                   WATERMARK: {currentUser.username} - {new Date().toLocaleDateString()} - INTERNAL_USE_ONLY
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] w-full max-w-lg rounded-2xl shadow-2xl p-10 animate-in zoom-in-95">
              <h3 className="text-xl font-bold mb-2">上传技术档案</h3>
              <p className="text-xs text-[#8b949e] mb-8 uppercase tracking-widest font-black">Archive Ingestion Hub</p>
              
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8b949e] uppercase">归属知识库</label>
                    <select className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-3 text-sm font-bold">
                       {MOCK_KBS.map(kb => <option key={kb.id}>{kb.name}</option>)}
                    </select>
                 </div>
                 
                 <div className="border-2 border-dashed border-[#d0d7de] dark:border-[#30363d] rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#0366d6] transition-all bg-[#f6f8fa]/50 dark:bg-[#0d1117]/50 group">
                    <div className="w-12 h-12 text-[#8b949e] mb-4 group-hover:text-[#0366d6] group-hover:scale-110 transition-all">
                       <Icons.Upload />
                    </div>
                    <p className="text-sm font-bold">点击或拖拽文件到此处</p>
                    <p className="text-[10px] text-[#57606a] mt-2">支持 PDF, XLSX, DOCX, ZIP (最大 500MB)</p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8b949e] uppercase">安全密级标记</label>
                    <div className="flex gap-2">
                       {Object.values(ClearanceLevel).map(c => (
                         <button key={c} className="flex-1 py-1.5 border border-[#30363d] rounded text-[10px] font-bold hover:bg-white/5 active:bg-[#0366d6] active:text-white transition-colors">{c}</button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 mt-10">
                 <button onClick={() => setIsUploading(false)} className="flex-1 py-2.5 text-xs font-bold border border-[#30363d] rounded-xl hover:bg-white/5">取消</button>
                 <button onClick={() => { setIsUploading(false); alert("文件已提交安全审计队列，扫描完成后将自动入库。"); }} className="flex-1 py-2.5 text-xs font-bold bg-[#0366d6] text-white rounded-xl shadow-lg">提交上传并审计</button>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
