
import React, { useState } from 'react';
import { Icons, MOCK_KBS, MOCK_AUDIT_LOGS, MOCK_POLICIES, MOCK_DEPARTMENTS, MOCK_ROLES, MOCK_USERS, MOCK_FAQS } from '../constants.tsx';
import { ClearanceLevel, User, KnowledgeBase, SensitiveWordPolicy, RegistrationRequest, AuditStatus, AuditLog, Department, Role, Permission, FAQPair, UserRole, RetrievalConfig } from '../types.ts';

const AdminView: React.FC = () => {
  const [adminTab, setAdminTab] = useState<'approvals' | 'departments' | 'roles' | 'users' | 'kbs' | 'security' | 'audit' | 'faq_gov' | 'search_config'>('approvals');
  
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [kbs, setKbs] = useState<KnowledgeBase[]>(MOCK_KBS);
  const [policies, setPolicies] = useState<SensitiveWordPolicy[]>(MOCK_POLICIES);
  const [faqs, setFaqs] = useState<FAQPair[]>(MOCK_FAQS);
  
  // Search Config State
  const [globalRetrievalConfig, setGlobalRetrievalConfig] = useState<RetrievalConfig>({
      selected_kb_ids: [],
      strategy: 'hybrid',
      tiers: { faq: true, graph: true, docs: true, llm: true },
      enhanced: { queryRewrite: true, hyde: false, stepback: true }
  });

  const [requests, setRequests] = useState<RegistrationRequest[]>([
    {
      id: 'req-1',
      fullName: '陈研员',
      username: 'chenyanyuan',
      departmentId: 'd3',
      intendedClearance: ClearanceLevel.SECRET,
      justification: '需要调阅某型火控雷达的电磁干扰原始数据，进行下一代算法仿真。',
      status: AuditStatus.PENDING,
      requestDate: '2024-03-24 14:20'
    }
  ]);

  const [faqReviews, setFaqReviews] = useState<FAQPair[]>([
    {
      id: 'rev-1',
      question: '装甲钢板的抗弹性能实验标准是什么？',
      answer: '参考 GJB-2023 坦克装甲防护标准，主要包含 V50 弹道极限测试及局部熔坑深度分析。',
      category: '实验标准',
      status: AuditStatus.PENDING,
      clearance: ClearanceLevel.INTERNAL,
      lastUpdated: '2024-03-26',
      suggestedBy: '陆研工'
    }
  ]);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // --- Handlers ---

  const handleApproveFAQ = (rev: FAQPair) => {
    setFaqs([...faqs, { ...rev, status: AuditStatus.APPROVED }]);
    setFaqReviews(faqReviews.filter(r => r.id !== rev.id));
    alert("问答对已正式入库。");
  };

  const handleApprove = (req: RegistrationRequest) => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: req.fullName,
      username: req.username,
      departmentId: req.departmentId,
      role: (roles.find(r => r.departmentId === req.departmentId) as any)?.name || 'USER',
      roleId: 'r3', // Default researcher role
      clearance: req.intendedClearance,
      status: 'ACTIVE'
    };
    setUsers([...users, newUser]);
    setRequests(requests.filter(r => r.id !== req.id));
    alert("审计批准成功，人员已自动激活。");
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const selectedDeptId = form.departmentId.value;
    const selectedRoleId = form.roleId.value;
    
    // Find associated Role Name and Department Name for UI consistency if needed, 
    // though purely strictly we store IDs.
    const roleObj = roles.find(r => r.id === selectedRoleId);

    const newUser: User = {
      id: editingItem?.id || `u-${Date.now()}`,
      name: form.name.value,
      username: form.username.value,
      departmentId: selectedDeptId,
      roleId: selectedRoleId,
      role: (roleObj?.name === '总研制师' ? UserRole.SUPER_ADMIN : roleObj?.name === '机密审计员' ? UserRole.KB_MANAGER : UserRole.USER),
      clearance: form.clearance.value as ClearanceLevel,
      status: form.status.value as any
    };

    if (editingItem) {
      setUsers(users.map(u => u.id === newUser.id ? newUser : u));
    } else {
      setUsers([...users, newUser]);
    }
    setActiveModal(null);
  };

  const handleSaveKB = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    
    // Handle multi-selects by converting FileList/OptionsCollection to array
    const getSelectedValues = (selectName: string) => {
        const checkboxes = document.querySelectorAll(`input[name="${selectName}"]:checked`);
        return Array.from(checkboxes).map((cb: any) => cb.value);
    };

    const selectedDepts = getSelectedValues('authorized_departments');
    const selectedRoles = getSelectedValues('authorized_roles');
    const selectedUsers = getSelectedValues('authorized_users');

    const newKB: KnowledgeBase = {
      id: editingItem?.id || `kb-${Date.now()}`,
      name: form.name.value,
      description: form.description.value,
      clearance: form.clearance.value as ClearanceLevel,
      authorized_departments: selectedDepts,
      authorized_roles: selectedRoles,
      authorized_users: selectedUsers,
      owner_id: editingItem?.owner_id || '1',
      created_at: editingItem?.created_at || new Date().toISOString().split('T')[0]
    };

    if (editingItem) {
      setKbs(kbs.map(k => k.id === newKB.id ? newKB : k));
    } else {
      setKbs([...kbs, newKB]);
    }
    setActiveModal(null);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const newPolicy: SensitiveWordPolicy = {
      id: editingItem?.id || `p-${Date.now()}`,
      word: form.word.value,
      replacement: form.replacement.value,
      severity: form.severity.value as any,
      is_active: form.is_active.checked
    };

    if (editingItem) {
      setPolicies(policies.map(p => p.id === newPolicy.id ? newPolicy : p));
    } else {
      setPolicies([...policies, newPolicy]);
    }
    setActiveModal(null);
  };


  return (
    <div className="flex h-full bg-[#f6f8fa] dark:bg-[#0d1117] transition-all overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-[#d0d7de] dark:border-[#30363d] p-4 flex flex-col gap-1 bg-[#f6f8fa] dark:bg-[#0d1117]">
        <h3 className="px-3 py-2 text-[10px] font-black text-[#57606a] dark:text-[#8b949e] uppercase tracking-widest">研制治理核心</h3>
        {[
          { id: 'approvals', label: '待办审计', icon: '⚖️', count: requests.length },
          { id: 'faq_gov', label: 'QA 治理', icon: '🧠', count: faqReviews.length },
          { id: 'users', label: '人员治理', icon: '👥' },
          { id: 'kbs', label: '资源库管理', icon: '🗄️' },
          { id: 'search_config', label: '检索策略', icon: '⚙️' }, // New Tab
          { id: 'security', label: '合规策略', icon: '🛡️' },
          { id: 'audit', label: '历史审计', icon: '📋' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id as any)}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all flex items-center justify-between group ${
              adminTab === tab.id 
                ? 'bg-white dark:bg-[#1c2128] border border-[#d0d7de] dark:border-[#30363d] font-bold shadow-sm' 
                : 'hover:bg-[#eaeef2] dark:hover:bg-[#21262d] border border-transparent text-[#57606a] dark:text-[#8b949e]'
            }`}
          >
            <span className="flex items-center gap-2">
               <span className="opacity-70">{tab.icon}</span> {tab.label}
            </span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-8 max-w-7xl">

        {/* --- SEARCH CONFIG TAB (NEW) --- */}
        {adminTab === 'search_config' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <div>
                   <h2 className="text-2xl font-bold">检索策略配置中心</h2>
                   <p className="text-sm text-[#57606a] dark:text-[#8b949e]">可视化编排全局 RAG 检索链路与召回参数。</p>
                </div>
                <button 
                  onClick={() => alert("策略已下发至全网节点")}
                  className="bg-[#0366d6] text-white px-6 py-2 rounded-md text-sm font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  <Icons.Activity /> 保存并下发策略
                </button>
             </div>

             <div className="grid grid-cols-12 gap-8">
                {/* Left Column: Visual Pipeline */}
                <div className="col-span-8 space-y-6">
                    {/* 1. Retrieval Sources */}
                    <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-6 relative overflow-hidden">
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
                            第一阶段：多路召回源配置 (Retrieval Sources)
                        </h3>
                        <div className="flex gap-4">
                            {[
                                { id: 'faq', label: 'FAQ 问答库', desc: '精确匹配历史问答对', active: globalRetrievalConfig.tiers.faq },
                                { id: 'graph', label: '知识图谱 (KG)', desc: '实体关系与多跳推理', active: globalRetrievalConfig.tiers.graph },
                                { id: 'docs', label: '非结构化文档', desc: '全文向量切片检索', active: globalRetrievalConfig.tiers.docs },
                            ].map((source) => (
                                <div key={source.id} className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    source.active 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' 
                                    : 'border-[#d0d7de] dark:border-[#30363d] opacity-60 grayscale'
                                }`}
                                onClick={() => setGlobalRetrievalConfig(prev => ({...prev, tiers: {...prev.tiers, [source.id]: !prev.tiers[source.id as keyof typeof prev.tiers]}}))}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold">{source.label}</span>
                                        <div className={`w-4 h-4 rounded-full border ${source.active ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-400'}`}></div>
                                    </div>
                                    <p className="text-xs text-[#57606a] dark:text-[#8b949e]">{source.desc}</p>
                                    {source.active && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-[10px] font-bold mb-1">
                                                <span>权重 (Weight)</span>
                                                <span>High</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-200 dark:bg-[#30363d] rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 w-[80%]"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Enhancement Pipeline (Flowchart style) */}
                    <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-6 relative">
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span> 
                            第二阶段：智能增强流水线 (Reasoning Pipeline)
                        </h3>
                        
                        <div className="flex items-center justify-between relative z-10">
                             {/* Start Node */}
                             <div className="flex flex-col items-center gap-2">
                                 <div className="w-12 h-12 rounded-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] flex items-center justify-center font-bold text-xs">Query</div>
                             </div>

                             {/* Arrow */}
                             <div className="h-0.5 flex-1 bg-[#d0d7de] dark:bg-[#30363d]"></div>

                             {/* Step 1: Rewrite */}
                             <div 
                                onClick={() => setGlobalRetrievalConfig(prev => ({...prev, enhanced: {...prev.enhanced, queryRewrite: !prev.enhanced.queryRewrite}}))}
                                className={`w-32 p-3 rounded-lg border cursor-pointer transition-all flex flex-col items-center gap-1 hover:scale-105 ${
                                    globalRetrievalConfig.enhanced.queryRewrite 
                                    ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-500 shadow-md' 
                                    : 'bg-[#f6f8fa] dark:bg-[#0d1117] border-[#d0d7de] dark:border-[#30363d] opacity-60'
                                }`}>
                                 <span className="text-lg">✍️</span>
                                 <span className="text-xs font-bold">Query Rewrite</span>
                                 <span className="text-[9px] text-center text-[#57606a]">历史补全 & 纠错</span>
                             </div>

                             {/* Arrow */}
                             <div className="h-0.5 flex-1 bg-[#d0d7de] dark:bg-[#30363d]"></div>

                             {/* Step 2: Stepback */}
                             <div 
                                onClick={() => setGlobalRetrievalConfig(prev => ({...prev, enhanced: {...prev.enhanced, stepback: !prev.enhanced.stepback}}))}
                                className={`w-32 p-3 rounded-lg border cursor-pointer transition-all flex flex-col items-center gap-1 hover:scale-105 ${
                                    globalRetrievalConfig.enhanced.stepback 
                                    ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-500 shadow-md' 
                                    : 'bg-[#f6f8fa] dark:bg-[#0d1117] border-[#d0d7de] dark:border-[#30363d] opacity-60'
                                }`}>
                                 <span className="text-lg">🔙</span>
                                 <span className="text-xs font-bold">Step-Back</span>
                                 <span className="text-[9px] text-center text-[#57606a]">抽象化问题提炼</span>
                             </div>

                             {/* Arrow */}
                             <div className="h-0.5 flex-1 bg-[#d0d7de] dark:bg-[#30363d]"></div>

                             {/* Step 3: HyDE */}
                             <div 
                                onClick={() => setGlobalRetrievalConfig(prev => ({...prev, enhanced: {...prev.enhanced, hyde: !prev.enhanced.hyde}}))}
                                className={`w-32 p-3 rounded-lg border cursor-pointer transition-all flex flex-col items-center gap-1 hover:scale-105 ${
                                    globalRetrievalConfig.enhanced.hyde 
                                    ? 'bg-teal-50 dark:bg-teal-900/10 border-teal-500 shadow-md' 
                                    : 'bg-[#f6f8fa] dark:bg-[#0d1117] border-[#d0d7de] dark:border-[#30363d] opacity-60'
                                }`}>
                                 <span className="text-lg">🔮</span>
                                 <span className="text-xs font-bold">HyDE</span>
                                 <span className="text-[9px] text-center text-[#57606a]">假设性答案生成</span>
                             </div>

                             {/* Arrow */}
                             <div className="h-0.5 flex-1 bg-[#d0d7de] dark:bg-[#30363d]"></div>

                             {/* End Node */}
                             <div className="flex flex-col items-center gap-2">
                                 <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs shadow-lg">LLM</div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Parameters */}
                <div className="col-span-4 space-y-6">
                    {/* Strategy Selector */}
                    <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-6">
                         <h3 className="text-xs font-black text-[#8b949e] uppercase mb-4">核心检索算法</h3>
                         <div className="space-y-3">
                             {[
                                 { id: 'keyword', label: '关键词检索 (BM25)', icon: 'ABC' },
                                 { id: 'vector', label: '稠密向量检索 (Dense)', icon: '◎' },
                                 { id: 'hybrid', label: '混合检索 (Hybrid RRF)', icon: '⚡' },
                             ].map((s) => (
                                 <div 
                                    key={s.id} 
                                    onClick={() => setGlobalRetrievalConfig(prev => ({...prev, strategy: s.id as any}))}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                                        globalRetrievalConfig.strategy === s.id 
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                        : 'border-[#d0d7de] dark:border-[#30363d] hover:bg-[#f6f8fa] dark:hover:bg-[#0d1117]'
                                    }`}
                                 >
                                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                         globalRetrievalConfig.strategy === s.id ? 'border-blue-500' : 'border-gray-400'
                                     }`}>
                                         {globalRetrievalConfig.strategy === s.id && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                     </div>
                                     <div className="flex-1">
                                         <p className="text-xs font-bold">{s.label}</p>
                                     </div>
                                     <span className="font-mono text-xs opacity-50">{s.icon}</span>
                                 </div>
                             ))}
                         </div>
                    </div>

                    {/* Parameters */}
                    <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-6">
                         <h3 className="text-xs font-black text-[#8b949e] uppercase mb-4">召回参数 (Parameters)</h3>
                         <div className="space-y-6">
                             <div>
                                 <div className="flex justify-between text-xs font-bold mb-2">
                                     <span>Top-K 截断</span>
                                     <span className="text-blue-500">5</span>
                                 </div>
                                 <input type="range" min="1" max="10" defaultValue="5" className="w-full accent-blue-500" />
                                 <p className="text-[9px] text-[#57606a] mt-1">控制送入大模型的上下文片段数量</p>
                             </div>
                             <div>
                                 <div className="flex justify-between text-xs font-bold mb-2">
                                     <span>相似度阈值 (Threshold)</span>
                                     <span className="text-blue-500">0.75</span>
                                 </div>
                                 <input type="range" min="0" max="1" step="0.05" defaultValue="0.75" className="w-full accent-blue-500" />
                                 <p className="text-[9px] text-[#57606a] mt-1">过滤低相关性的噪声数据</p>
                             </div>
                         </div>
                    </div>
                </div>
             </div>
          </div>
        )}
        
        {/* --- USERS MANAGEMENT TAB --- */}
        {adminTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <div>
                   <h2 className="text-2xl font-bold">人员准入与权限治理</h2>
                   <p className="text-sm text-[#57606a] dark:text-[#8b949e]">管理研制人员的系统访问级别、角色绑定及账号状态。</p>
                </div>
                <button 
                  onClick={() => { setEditingItem(null); setActiveModal('user'); }} 
                  className="bg-[#2da44e] hover:bg-[#2c974b] text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-md flex items-center gap-2 transition-all"
                >
                  <Icons.Plus /> 录入新成员
                </button>
             </div>

             <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                   <thead className="bg-[#f6f8fa] dark:bg-[#1c2128] border-b border-[#d0d7de] dark:border-[#30363d]">
                      <tr>
                         <th className="px-6 py-4 font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">成员信息</th>
                         <th className="px-6 py-4 font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">所属部门</th>
                         <th className="px-6 py-4 font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">系统角色</th>
                         <th className="px-6 py-4 font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">密级</th>
                         <th className="px-6 py-4 font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">状态</th>
                         <th className="px-6 py-4 text-right font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">操作</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                      {users.map(user => {
                        const deptName = departments.find(d => d.id === user.departmentId)?.name || '未知部门';
                        const roleName = roles.find(r => r.id === user.roleId)?.name || '未分配';
                        return (
                         <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#1c2128] group">
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                    {user.name.charAt(0)}
                                  </div>
                                  <div>
                                     <div className="font-bold">{user.name}</div>
                                     <div className="text-xs text-[#57606a] dark:text-[#8b949e] font-mono">@{user.username}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium">{deptName}</td>
                            <td className="px-6 py-4 text-xs">
                               <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                 {roleName}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               <span className={`text-[10px] font-black px-2 py-0.5 border rounded uppercase ${
                                  user.clearance === ClearanceLevel.SECRET ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-900/10' : 
                                  user.clearance === ClearanceLevel.CONFIDENTIAL ? 'border-orange-500 text-orange-500 bg-orange-50 dark:bg-orange-900/10' :
                                  'border-green-500 text-green-500 bg-green-50 dark:bg-green-900/10'
                               }`}>
                                  {user.clearance}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                  <span className="text-xs font-bold">{user.status === 'ACTIVE' ? '正常' : '锁定'}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <button 
                                 onClick={() => { setEditingItem(user); setActiveModal('user'); }}
                                 className="text-blue-500 hover:text-blue-700 text-xs font-bold mr-3"
                               >
                                 编辑
                               </button>
                               <button className="text-red-500 hover:text-red-700 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                 冻结
                               </button>
                            </td>
                         </tr>
                        );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- KB MANAGEMENT TAB --- */}
        {adminTab === 'kbs' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <div>
                   <h2 className="text-2xl font-bold">资源库资产地图与白名单</h2>
                   <p className="text-sm text-[#57606a] dark:text-[#8b949e]">配置知识库的元数据、安全密级及访问控制列表 (ACL)。</p>
                </div>
                <button 
                  onClick={() => { setEditingItem(null); setActiveModal('kb'); }}
                  className="bg-[#0366d6] text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-md hover:bg-[#0256b4] flex items-center gap-2 transition-all"
                >
                  <Icons.Plus /> 新建资源库
                </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {kbs.map(kb => (
                  <div key={kb.id} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-6 rounded-xl flex flex-col group hover:border-[#0366d6] transition-all shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                       <Icons.Database />
                    </div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg group-hover:text-[#0366d6] transition-colors">{kb.name}</h4>
                        <p className="text-xs text-[#57606a] dark:text-[#8b949e] mt-1 h-10 overflow-hidden text-ellipsis leading-relaxed">{kb.description}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 border rounded uppercase tracking-wider ${
                        kb.clearance === '机密' ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-900/10' : 
                        'border-green-500 text-green-500 bg-green-50 dark:bg-green-900/10'
                      }`}>
                        {kb.clearance}
                      </span>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-[#f0f2f4] dark:border-[#30363d] space-y-4">
                       <p className="text-[10px] font-black text-[#8b949e] uppercase tracking-widest flex items-center gap-2">
                         <span>访问白名单控制 (ACL)</span>
                         <span className="flex-1 h-px bg-[#d0d7de] dark:bg-[#30363d]"></span>
                       </p>
                       <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[#f6f8fa] dark:bg-[#0d1117] p-2 rounded border border-[#d0d7de] dark:border-[#30363d] text-center">
                             <p className="text-xl font-bold text-[#24292f] dark:text-[#c9d1d9]">{kb.authorized_departments.length}</p>
                             <p className="text-[9px] text-[#57606a] uppercase font-bold mt-1">关联部门</p>
                          </div>
                          <div className="bg-[#f6f8fa] dark:bg-[#0d1117] p-2 rounded border border-[#d0d7de] dark:border-[#30363d] text-center">
                             <p className="text-xl font-bold text-[#24292f] dark:text-[#c9d1d9]">{kb.authorized_roles.length}</p>
                             <p className="text-[9px] text-[#57606a] uppercase font-bold mt-1">关联角色</p>
                          </div>
                          <div className="bg-[#f6f8fa] dark:bg-[#0d1117] p-2 rounded border border-[#d0d7de] dark:border-[#30363d] text-center">
                             <p className="text-xl font-bold text-[#24292f] dark:text-[#c9d1d9]">{kb.authorized_users.length}</p>
                             <p className="text-[9px] text-[#57606a] uppercase font-bold mt-1">特权人员</p>
                          </div>
                       </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                       <button 
                         onClick={() => { setEditingItem(kb); setActiveModal('kb'); }}
                         className="flex-1 py-2 text-xs font-bold bg-[#f6f8fa] dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] rounded hover:border-[#0366d6] hover:text-[#0366d6] transition-all"
                       >
                         配置权限策略
                       </button>
                       <button className="flex-1 py-2 text-xs font-bold bg-[#f6f8fa] dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] rounded hover:border-[#0366d6] hover:text-[#0366d6] transition-all">
                         审计资产
                       </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- APPROVALS TAB --- */}
        {adminTab === 'approvals' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold">待审计入网申请</h2>
              <p className="text-sm text-[#57606a] dark:text-[#8b949e]">所有新成员入驻及权限变更请求均需在此审批。</p>
            </div>
            {requests.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-[#d0d7de] dark:border-[#30363d] rounded-xl text-center text-[#8b949e]">
                 <p className="text-sm">暂无待处理的审计申请</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req.id} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-6 rounded-xl shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                         <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">{req.fullName.charAt(0)}</div>
                         <div>
                            <h4 className="font-bold">{req.fullName} <span className="font-normal text-[#57606a] dark:text-[#8b949e]">(@{req.username})</span></h4>
                            <p className="text-xs text-[#57606a] mt-1">
                              申请部门: <span className="font-bold">{departments.find(d => d.id === req.departmentId)?.name}</span> | 
                              预定密级: <span className="font-bold text-blue-500">{req.intendedClearance}</span>
                            </p>
                         </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#8b949e]">{req.requestDate}</span>
                    </div>
                    <div className="bg-[#f6f8fa] dark:bg-[#0d1117] p-4 rounded-lg border border-[#d0d7de] dark:border-[#30363d]">
                       <p className="text-[9px] font-black text-[#8b949e] uppercase mb-1">审计理由</p>
                       <p className="text-sm text-[#24292f] dark:text-[#c9d1d9] leading-relaxed italic">"{req.justification}"</p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => alert("驳回请求已发送")} className="px-4 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded border border-red-500/20">驳回申请</button>
                      <button onClick={() => handleApprove(req)} className="px-6 py-1.5 text-xs font-bold bg-[#238636] text-white rounded shadow-sm hover:bg-[#2ea043] active:scale-95 transition-all">通过审计</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- FAQ GOVERNANCE TAB --- */}
        {adminTab === 'faq_gov' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">QA 问答治理与回流审核</h2>
                <button className="bg-[#0366d6] text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-md">管理 FAQ 库 ({faqs.length})</button>
             </div>
             
             {faqReviews.length === 0 ? (
               <div className="p-12 border-2 border-dashed dark:border-[#30363d] rounded-xl text-center text-[#8b949e]">暂无待审核的问答回流请求</div>
             ) : (
               <div className="space-y-4">
                 {faqReviews.map(rev => (
                   <div key={rev.id} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-6 rounded-xl shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                         <div className="flex gap-3">
                            <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded font-bold uppercase">回流申请</span>
                            <span className="text-xs text-[#8b949e]">建议人: <strong>{rev.suggestedBy}</strong></span>
                         </div>
                         <span className="text-[10px] font-mono text-[#8b949e]">{rev.lastUpdated}</span>
                      </div>
                      <div className="space-y-2">
                         <p className="text-xs font-black text-[#8b949e] uppercase">标准问题</p>
                         <p className="font-bold text-sm">{rev.question}</p>
                         <div className="h-px bg-[#f0f2f4] dark:bg-[#30363d]"></div>
                         <p className="text-xs font-black text-[#8b949e] uppercase mt-4">标准回答</p>
                         <p className="text-sm dark:text-[#c9d1d9] leading-relaxed italic">"{rev.answer}"</p>
                      </div>
                      <div className="flex gap-2 justify-end pt-4">
                         <button className="px-4 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded">驳回</button>
                         <button onClick={() => handleApproveFAQ(rev)} className="px-6 py-1.5 text-xs font-bold bg-[#238636] text-white rounded shadow-sm">批准入库</button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {/* --- SECURITY / DLP TAB --- */}
        {adminTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">合规脱敏策略 (DLP)</h2>
                <button onClick={() => { setEditingItem(null); setActiveModal('policy'); }} className="bg-[#0366d6] text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-md hover:opacity-90 flex items-center gap-2">
                  <Icons.Plus /> 新增拦截词
                </button>
             </div>
             <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                   <thead className="bg-[#f6f8fa] dark:bg-[#1c2128] border-b border-[#d0d7de] dark:border-[#30363d]">
                      <tr>
                         <th className="px-6 py-4 font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">敏感词 (Intercept)</th>
                         <th className="px-6 py-4 font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">替换词 (Mask)</th>
                         <th className="px-6 py-4 font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">风险等级</th>
                         <th className="px-6 py-4 font-bold text-xs uppercase text-[#57606a] dark:text-[#8b949e]">启用状态</th>
                         <th className="px-6 py-4 font-bold text-right text-xs uppercase text-[#57606a] dark:text-[#8b949e]">操作</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                      {policies.map(p => (
                         <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#1c2128]">
                            <td className="px-6 py-4 font-mono text-red-500 font-bold">{p.word}</td>
                            <td className="px-6 py-4 font-mono text-green-500 font-bold">{p.replacement}</td>
                            <td className="px-6 py-4">
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {p.severity === 'high' ? '严重核心' : '常规敏感'}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               <div className={`w-8 h-4 rounded-full relative transition-colors ${p.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${p.is_active ? 'right-0.5' : 'left-0.5'}`}></div>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex gap-3 justify-end">
                                  <button onClick={() => { setEditingItem(p); setActiveModal('policy'); }} className="text-[#0366d6] text-xs font-bold hover:underline">编辑</button>
                                  <button onClick={() => setPolicies(policies.filter(i => i.id !== p.id))} className="text-red-500 text-xs font-bold hover:underline">注销</button>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- AUDIT LOG TAB --- */}
        {adminTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">系统历史审计日志</h2>
                <div className="flex gap-2">
                   <button className="px-3 py-1.5 border border-[#30363d] rounded text-xs font-bold hover:bg-gray-800">导出 PDF 报表</button>
                   <button className="px-3 py-1.5 border border-[#30363d] rounded text-xs font-bold hover:bg-gray-800">清理 30天前记录</button>
                </div>
             </div>
             <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                   <thead className="bg-[#f6f8fa] dark:bg-[#1c2128] border-b border-[#d0d7de] dark:border-[#30363d]">
                      <tr>
                         <th className="px-6 py-4 font-bold uppercase text-[#57606a] dark:text-[#8b949e]">时间戳</th>
                         <th className="px-6 py-4 font-bold uppercase text-[#57606a] dark:text-[#8b949e]">执行主体</th>
                         <th className="px-6 py-4 font-bold uppercase text-[#57606a] dark:text-[#8b949e]">操作指令</th>
                         <th className="px-6 py-4 font-bold uppercase text-[#57606a] dark:text-[#8b949e]">资源对象</th>
                         <th className="px-6 py-4 font-bold text-right uppercase text-[#57606a] dark:text-[#8b949e]">执行结果</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                      {MOCK_AUDIT_LOGS.map(log => (
                         <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#1c2128]">
                            <td className="px-6 py-4 font-mono text-[#57606a] dark:text-[#8b949e]">{log.timestamp}</td>
                            <td className="px-6 py-4">
                               <p className="font-bold">{log.userName}</p>
                               <p className="text-[10px] text-[#8b949e]">ID: {log.userId}</p>
                            </td>
                            <td className="px-6 py-4 font-mono">{log.action}</td>
                            <td className="px-6 py-4">{log.resource}</td>
                            <td className="px-6 py-4 text-right">
                               <span className={`font-bold px-2 py-1 rounded ${
                                  log.status === 'SUCCESS' ? 'text-green-500' : log.status === 'DENIED' ? 'text-red-500' : 'text-yellow-500'
                               }`}>{log.status}</span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
        
      </div>

      {/* --- MODALS --- */}
      
      {/* User Editing Modal */}
      {activeModal === 'user' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <form onSubmit={handleSaveUser} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] w-full max-w-lg rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-bold mb-6">{editingItem ? `编辑人员: ${editingItem.name}` : '录入新研制成员'}</h3>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-[#8b949e] uppercase">真实姓名</label>
                       <input name="name" defaultValue={editingItem?.name} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-[#8b949e] uppercase">系统账号</label>
                       <input name="username" defaultValue={editingItem?.username} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm font-mono" />
                    </div>
                 </div>
                 
                 <div className="space-y-1">
                     <label className="text-[10px] font-black text-[#8b949e] uppercase">所属部门</label>
                     <select name="departmentId" defaultValue={editingItem?.departmentId} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                     </select>
                 </div>

                 <div className="space-y-1">
                     <label className="text-[10px] font-black text-[#8b949e] uppercase">系统角色</label>
                     <select name="roleId" defaultValue={editingItem?.roleId} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                     </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#8b949e] uppercase">访问密级</label>
                        <select name="clearance" defaultValue={editingItem?.clearance} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                           {Object.values(ClearanceLevel).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#8b949e] uppercase">账号状态</label>
                        <select name="status" defaultValue={editingItem?.status || 'ACTIVE'} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                           <option value="ACTIVE">正常 (Active)</option>
                           <option value="LOCKED">锁定 (Locked)</option>
                           <option value="INACTIVE">离职 (Inactive)</option>
                        </select>
                     </div>
                 </div>
              </div>
              <div className="flex gap-4 mt-8">
                 <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 text-sm font-bold border border-[#30363d] rounded hover:bg-gray-50 dark:hover:bg-[#21262d]">取消</button>
                 <button type="submit" className="flex-1 py-2 text-sm font-bold bg-[#0366d6] text-white rounded shadow-lg">保存人员信息</button>
              </div>
           </form>
        </div>
      )}

      {/* KB Editing Modal */}
      {activeModal === 'kb' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <form onSubmit={handleSaveKB} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] w-full max-w-2xl rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-6">{editingItem ? `资源库权限分发: ${editingItem.name}` : '新建研制资源库'}</h3>
              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-[#8b949e] uppercase">库名称</label>
                       <input name="name" defaultValue={editingItem?.name} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-[#8b949e] uppercase">基准密级</label>
                       <select name="clearance" defaultValue={editingItem?.clearance} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                          {Object.values(ClearanceLevel).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">业务描述</label>
                    <textarea name="description" defaultValue={editingItem?.description} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm h-16 resize-none" />
                 </div>
                 
                 <div className="h-px bg-[#30363d] my-2"></div>
                 
                 <div className="space-y-4">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">访问白名单控制 (Access Control List)</p>
                    <div className="grid grid-cols-3 gap-6">
                       {/* Departments ACL */}
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#8b949e] uppercase">授权部门 (DEPT)</label>
                          <div className="space-y-1 max-h-40 overflow-y-auto border border-[#30363d] p-2 rounded bg-[#0d1117]">
                             {departments.map(d => (
                                <label key={d.id} className="flex items-center gap-2 hover:bg-gray-800 p-1 rounded cursor-pointer">
                                   <input type="checkbox" name="authorized_departments" value={d.id} defaultChecked={editingItem?.authorized_departments?.includes(d.id)} />
                                   <span className="text-[10px] truncate">{d.name}</span>
                                </label>
                             ))}
                          </div>
                       </div>
                       {/* Roles ACL */}
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#8b949e] uppercase">授权角色 (ROLE)</label>
                          <div className="space-y-1 max-h-40 overflow-y-auto border border-[#30363d] p-2 rounded bg-[#0d1117]">
                             {roles.map(r => (
                                <label key={r.id} className="flex items-center gap-2 hover:bg-gray-800 p-1 rounded cursor-pointer">
                                   <input type="checkbox" name="authorized_roles" value={r.id} defaultChecked={editingItem?.authorized_roles?.includes(r.id)} />
                                   <span className="text-[10px] truncate">{r.name}</span>
                                </label>
                             ))}
                          </div>
                       </div>
                       {/* Users ACL */}
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#8b949e] uppercase">人员特权 (USER)</label>
                          <div className="space-y-1 max-h-40 overflow-y-auto border border-[#30363d] p-2 rounded bg-[#0d1117]">
                             {users.map(u => (
                                <label key={u.id} className="flex items-center gap-2 hover:bg-gray-800 p-1 rounded cursor-pointer">
                                   <input type="checkbox" name="authorized_users" value={u.id} defaultChecked={editingItem?.authorized_users?.includes(u.id)} />
                                   <span className="text-[10px] truncate">{u.name}</span>
                                </label>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="flex gap-4 mt-10">
                 <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 text-sm font-bold border border-[#30363d] rounded hover:bg-gray-50 dark:hover:bg-[#21262d]">取消</button>
                 <button type="submit" className="flex-1 py-2 text-sm font-bold bg-[#0366d6] text-white rounded shadow-lg">保存分发策略</button>
              </div>
           </form>
        </div>
      )}
      
      {/* Policy Editing Modal */}
      {activeModal === 'policy' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <form onSubmit={handleSavePolicy} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] w-full max-w-md rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-bold mb-6">{editingItem ? '修改脱敏规则' : '定义新 DLP 拦截词'}</h3>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">拦截关键词</label>
                    <input name="word" defaultValue={editingItem?.word} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm font-mono" placeholder="如: J-20" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">脱敏替换内容</label>
                    <input name="replacement" defaultValue={editingItem?.replacement} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm font-mono" placeholder="如: [某型五代机]" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-[#8b949e] uppercase">风险等级</label>
                       <select name="severity" defaultValue={editingItem?.severity || 'high'} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                          <option value="high">严重核心 (HIGH)</option>
                          <option value="low">常规敏感 (LOW)</option>
                       </select>
                    </div>
                    <div className="space-y-1 flex flex-col justify-end pb-2">
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" name="is_active" defaultChecked={editingItem?.is_active ?? true} />
                          <span className="text-[10px] font-black text-[#8b949e] uppercase">立即激活策略</span>
                       </label>
                    </div>
                 </div>
              </div>
              <div className="flex gap-4 mt-10">
                 <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 text-sm font-bold border border-[#30363d] rounded hover:bg-gray-50 dark:hover:bg-[#21262d]">取消</button>
                 <button type="submit" className="flex-1 py-2 text-sm font-bold bg-[#0366d6] text-white rounded shadow-lg">应用策略</button>
              </div>
           </form>
        </div>
      )}

    </div>
  );
};

export default AdminView;
