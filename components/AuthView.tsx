
import React, { useState } from 'react';
import { Icons } from '../constants.tsx';
import { UserRole, ClearanceLevel, User, RegisterUserRequest } from '../types.ts';
import { AuthService } from '../services/api.ts';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [viewState, setViewState] = useState<'login' | 'register' | 'pending'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dept, setDept] = useState('d1');
  const [clearance, setClearance] = useState(ClearanceLevel.INTERNAL);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (viewState === 'login') {
        const response = await AuthService.login({ username, secret: password });
        const { token, user } = response.data;
        
        // Save token and update state
        localStorage.setItem('auth_token', token);
        onLogin(user);
        
      } else {
        const payload: RegisterUserRequest = {
          fullName,
          username,
          password,
          departmentId: dept,
          intendedClearance: clearance,
          justification: reason
        };
        
        await AuthService.register(payload);
        setViewState('pending');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("认证失败，请检查账号密码或网络连接。");
    } finally {
      setLoading(false);
    }
  };

  if (viewState === 'pending') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl p-10 text-center space-y-6 shadow-2xl">
           <div className="w-20 h-20 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
           </div>
           <h2 className="text-2xl font-bold text-[#f0f6fc]">申请已提交审计</h2>
           <p className="text-sm text-[#8b949e] leading-relaxed">
             您的注册请求正处于【兵工研制大脑】安全委员会审批中。
           </p>
           <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] text-left space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase text-[#57606a]">
                 <span>预选密级</span>
                 <span className="text-[#c9d1d9]">{clearance}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase text-[#57606a]">
                 <span>审批状态</span>
                 <span className="text-yellow-500 animate-pulse">审计队列排队中...</span>
              </div>
           </div>
           <button 
            onClick={() => setViewState('login')}
            className="w-full py-2.5 text-xs font-bold text-[#58a6ff] hover:bg-[#58a6ff]/10 rounded-md transition-colors"
           >
             返回登录
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm transition-all duration-300 transform">
        <div className="flex flex-col items-center mb-10">
          <div className="p-3 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20 mb-4 animate-bounce">
            <Icons.Database />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">兵工研制大脑</h1>
          <p className="text-[#8b949e] text-xs font-mono mt-1 tracking-widest uppercase">Security Clearance Required</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#161b22] border border-[#30363d] p-8 rounded-xl shadow-2xl space-y-5">
          {errorMsg && (
             <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded">
               ⚠️ {errorMsg}
             </div>
          )}
          
          {viewState === 'register' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#8b949e] uppercase">真实姓名 (Full Name)</label>
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                  placeholder="张三"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#8b949e] uppercase">所属部门</label>
                  <select 
                    value={dept}
                    onChange={e => setDept(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="d1">动力系统研制中心</option>
                    <option value="d2">装甲结构设计部</option>
                    <option value="d3">火控系统实验室</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#8b949e] uppercase">申请密级</label>
                  <select 
                    value={clearance}
                    onChange={e => setClearance(e.target.value as ClearanceLevel)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  >
                    {Object.values(ClearanceLevel).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#8b949e] uppercase">访问理由 (Audit Justification)</label>
                <textarea 
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none h-20 resize-none"
                  placeholder="请输入您调阅武器档案的具体业务理由..."
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8b949e] uppercase">系统账户 (ID)</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
              placeholder="luyangong"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8b949e] uppercase">安全密令 (Passcode)</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            disabled={loading}
            className="w-full bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-bold py-2.5 rounded-md transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (viewState === 'login' ? '校验身份并进入' : '提交审计申请')}
          </button>
          
          <div className="text-center pt-2">
            <button 
              type="button"
              onClick={() => { setViewState(viewState === 'login' ? 'register' : 'login'); setErrorMsg(''); }}
              className="text-xs text-[#58a6ff] hover:underline"
            >
              {viewState === 'login' ? '新成员？申请研制授权' : '已有授权账号？立即校验'}
            </button>
          </div>
        </form>
        
        <div className="mt-8 flex flex-col items-center gap-4">
           <div className="h-px w-full bg-[#30363d]"></div>
           <p className="text-[9px] text-center text-[#484f58] uppercase tracking-[0.2em] leading-relaxed max-w-[280px]">
             Unauthorized access will trigger immediate network isolation and security protocols.
           </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
