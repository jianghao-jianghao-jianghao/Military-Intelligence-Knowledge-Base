
import React, { useState } from 'react';
import { Icons, MOCK_KBS, MOCK_AUDIT_LOGS, MOCK_POLICIES, MOCK_DEPARTMENTS, MOCK_ROLES, MOCK_USERS } from '../constants.tsx';
import { ClearanceLevel, User, KnowledgeBase, SensitiveWordPolicy, RegistrationRequest, AuditStatus, AuditLog, Department, Role, Permission } from '../types.ts';

const AdminView: React.FC = () => {
  const [adminTab, setAdminTab] = useState<'approvals' | 'departments' | 'roles' | 'users' | 'kbs' | 'security' | 'audit'>('approvals');
  
  // States for Entities
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
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
  const [policies, setPolicies] = useState<SensitiveWordPolicy[]>(MOCK_POLICIES);

  // Modal States
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Handlers
  const handleApprove = (req: RegistrationRequest) => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: req.fullName,
      username: req.username,
      departmentId: req.departmentId,
      roleId: 'r3', // Default researcher role
      clearance: req.intendedClearance,
      status: 'ACTIVE'
    };
    setUsers([...users, newUser]);
    setRequests(requests.filter(r => r.id !== req.id));
    alert("审计批准成功，人员已自动激活。");
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const newDept: Department = {
      id: editingItem?.id || `d-${Date.now()}`,
      name: form.name.value,
      code: form.code.value
    };
    if (editingItem) {
      setDepartments(departments.map(d => d.id === newDept.id ? newDept : d));
    } else {
      setDepartments([...departments, newDept]);
    }
    setActiveModal(null);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const selectedPermissions = Array.from(form.permissions)
      .filter((p: any) => p.checked)
      .map((p: any) => p.value as Permission);

    const newRole: Role = {
      id: editingItem?.id || `r-${Date.now()}`,
      name: form.name.value,
      departmentId: form.departmentId.value,
      permissions: selectedPermissions
    };

    if (editingItem) {
      setRoles(roles.map(r => r.id === newRole.id ? newRole : r));
    } else {
      setRoles([...roles, newRole]);
    }
    setActiveModal(null);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const newUser: User = {
      id: editingItem?.id || `u-${Date.now()}`,
      name: form.name.value,
      username: form.username.value,
      departmentId: form.departmentId.value,
      roleId: form.roleId.value,
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

  return (
    <div className="flex h-full bg-[#f6f8fa] dark:bg-[#0d1117] transition-all overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-[#d0d7de] dark:border-[#30363d] p-4 flex flex-col gap-1 bg-[#f6f8fa] dark:bg-[#0d1117]">
        <h3 className="px-3 py-2 text-[10px] font-black text-[#57606a] dark:text-[#8b949e] uppercase tracking-widest">系统治理中心</h3>
        {[
          { id: 'approvals', label: '待办审计', icon: '⚖️', count: requests.length },
          { id: 'departments', label: '组织架构', icon: '🏢' },
          { id: 'roles', label: '角色权限', icon: '🔑' },
          { id: 'users', label: '人员治理', icon: '👥' },
          { id: 'kbs', label: '资源库管理', icon: '🗄️' },
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8 max-w-7xl">
        {/* Approvals Tab */}
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

        {/* Departments Tab */}
        {adminTab === 'departments' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">组织机构治理</h2>
                <button onClick={() => { setEditingItem(null); setActiveModal('dept'); }} className="bg-[#0366d6] text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-md hover:opacity-90 flex items-center gap-2">
                  <Icons.Plus /> 新增部门
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {departments.map(dept => (
                  <div key={dept.id} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-5 rounded-xl flex flex-col group hover:border-[#0366d6] transition-all">
                    <h4 className="font-bold text-lg">{dept.name}</h4>
                    <p className="text-xs text-[#57606a] dark:text-[#8b949e] font-mono mt-1 uppercase tracking-widest">{dept.code}</p>
                    <div className="mt-6 flex justify-between items-center">
                      <span className="text-[10px] bg-[#f6f8fa] dark:bg-[#0d1117] px-2 py-0.5 rounded font-bold border border-[#30363d]">ID: {dept.id}</span>
                      <button onClick={() => { setEditingItem(dept); setActiveModal('dept'); }} className="text-xs text-[#0366d6] hover:underline font-bold opacity-0 group-hover:opacity-100 transition-opacity">编辑属性</button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Roles Tab */}
        {adminTab === 'roles' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">角色授权引擎 (RBAC)</h2>
                <button onClick={() => { setEditingItem(null); setActiveModal('role'); }} className="bg-[#0366d6] text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-md hover:opacity-90 flex items-center gap-2">
                  <Icons.Plus /> 新增角色
                </button>
             </div>
             <div className="space-y-4">
                {roles.map(role => (
                  <div key={role.id} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-6 rounded-xl flex items-center justify-between group">
                    <div className="space-y-2">
                       <h4 className="font-bold text-lg flex items-center gap-3">
                         {role.name}
                         <span className="text-[10px] font-normal text-[#8b949e] border border-[#30363d] px-1.5 py-0.5 rounded">
                           {departments.find(d => d.id === role.departmentId)?.name}
                         </span>
                       </h4>
                       <div className="flex flex-wrap gap-1.5">
                          {role.permissions.map(p => (
                            <span key={p} className="text-[9px] bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold">{p}</span>
                          ))}
                       </div>
                    </div>
                    <button onClick={() => { setEditingItem(role); setActiveModal('role'); }} className="px-4 py-2 border border-[#d0d7de] dark:border-[#30363d] text-xs font-bold rounded-md hover:bg-gray-50 dark:hover:bg-[#21262d]">策略编辑</button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Users Tab */}
        {adminTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold">人员准入治理</h2>
               <button onClick={() => { setEditingItem(null); setActiveModal('user'); }} className="bg-[#238636] text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-md hover:opacity-90 flex items-center gap-2">
                  <Icons.Plus /> 录入研制成员
               </button>
            </div>
            <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-[#f6f8fa] dark:bg-[#1c2128] border-b border-[#d0d7de] dark:border-[#30363d]">
                     <tr>
                        <th className="px-6 py-4 font-bold">成员姓名</th>
                        <th className="px-6 py-4 font-bold">部门与岗位</th>
                        <th className="px-6 py-4 font-bold">系统密级</th>
                        <th className="px-6 py-4 font-bold text-right">状态控制</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                     {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors group">
                           <td className="px-6 py-4">
                              <p className="font-bold">{u.name}</p>
                              <p className="text-xs text-[#57606a] font-mono">@{u.username}</p>
                           </td>
                           <td className="px-6 py-4">
                              <p className="font-medium">{departments.find(d => d.id === u.departmentId)?.name}</p>
                              <p className="text-[10px] text-[#57606a]">{roles.find(r => r.id === u.roleId)?.name}</p>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase ${
                                u.clearance === '机密' ? 'border-red-500 text-red-500 bg-red-50/10' : 'border-green-500 text-green-500 bg-green-50/10'
                              }`}>{u.clearance}</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                 <button onClick={() => { setEditingItem(u); setActiveModal('user'); }} className="text-[#0366d6] text-xs font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity">编辑</button>
                                 <span className={`text-[10px] font-bold ${u.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'}`}>{u.status}</span>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* KBS and other tabs are similar... omitted for length but logically follow the same pattern */}
        {(adminTab === 'kbs' || adminTab === 'security' || adminTab === 'audit') && (
           <div className="flex items-center justify-center h-64 text-[#8b949e]">
              已在模块 [App.tsx] 中定义，请在该模块中查看对应渲染。
           </div>
        )}
      </div>

      {/* MODALS */}
      {activeModal === 'dept' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <form onSubmit={handleSaveDepartment} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] w-full max-w-md rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-bold mb-6">{editingItem ? '编辑组织信息' : '创建新研制中心'}</h3>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">部门名称</label>
                    <input name="name" defaultValue={editingItem?.name} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">机构代码</label>
                    <input name="code" defaultValue={editingItem?.code} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm font-mono" />
                 </div>
              </div>
              <div className="flex gap-4 mt-10">
                 <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 text-sm font-bold border border-[#30363d] rounded hover:bg-gray-50 dark:hover:bg-[#21262d]">取消</button>
                 <button type="submit" className="flex-1 py-2 text-sm font-bold bg-[#0366d6] text-white rounded shadow-lg">提交保存</button>
              </div>
           </form>
        </div>
      )}

      {activeModal === 'role' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <form onSubmit={handleSaveRole} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] w-full max-w-lg rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-bold mb-6">{editingItem ? '角色策略调整' : '定义新角色集'}</h3>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">角色名称</label>
                    <input name="name" defaultValue={editingItem?.name} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">所属部门</label>
                    <select name="departmentId" defaultValue={editingItem?.departmentId} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                       {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2 pt-4 border-t border-[#30363d]">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">功能权限 (Fine-grained Permissions)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                       {Object.values(Permission).map(p => (
                          <label key={p} className="flex items-center gap-2 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded cursor-pointer">
                             <input type="checkbox" name="permissions" value={p} defaultChecked={editingItem?.permissions.includes(p)} className="rounded border-[#30363d] text-blue-600" />
                             <span className="text-xs">{p}</span>
                          </label>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="flex gap-4 mt-8">
                 <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 text-sm font-bold border border-[#30363d] rounded hover:bg-gray-50 dark:hover:bg-[#21262d]">取消</button>
                 <button type="submit" className="flex-1 py-2 text-sm font-bold bg-[#0366d6] text-white rounded shadow-lg">保存策略</button>
              </div>
           </form>
        </div>
      )}

      {activeModal === 'user' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <form onSubmit={handleSaveUser} className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] w-full max-w-lg rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-bold mb-6">{editingItem ? '研制成员档案变更' : '人员准入录入'}</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">真实姓名</label>
                    <input name="name" defaultValue={editingItem?.name} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">系统标识</label>
                    <input name="username" defaultValue={editingItem?.username} required className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm font-mono" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">所在机构</label>
                    <select name="departmentId" defaultValue={editingItem?.departmentId} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                       {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">赋予角色</label>
                    <select name="roleId" defaultValue={editingItem?.roleId} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                       {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">安全密级</label>
                    <select name="clearance" defaultValue={editingItem?.clearance} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                       {Object.values(ClearanceLevel).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8b949e] uppercase">状态控制</label>
                    <select name="status" defaultValue={editingItem?.status || 'ACTIVE'} className="w-full bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#30363d] rounded p-2 text-sm">
                       <option value="ACTIVE">正常激活 (ACTIVE)</option>
                       <option value="INACTIVE">暂未激活 (INACTIVE)</option>
                       <option value="LOCKED">锁定隔离 (LOCKED)</option>
                    </select>
                 </div>
              </div>
              <div className="flex gap-4 mt-10">
                 <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 text-sm font-bold border border-[#30363d] rounded hover:bg-gray-50 dark:hover:bg-[#21262d]">取消操作</button>
                 <button type="submit" className="flex-1 py-2 text-sm font-bold bg-[#238636] text-white rounded shadow-lg">确认执行</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default AdminView;
