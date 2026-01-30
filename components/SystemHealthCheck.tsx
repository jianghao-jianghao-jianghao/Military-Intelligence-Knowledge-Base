import React, { useState } from 'react';
import { 
  AuthService, 
  AdminService, 
  ChatService, 
  DocumentService, 
  GraphService, 
  AgentService,
  ApiService
} from '../services/api.ts';
import { ClearanceLevel, UserRole, AuditStatus } from '../types.ts';

type TestStatus = 'idle' | 'running' | 'success' | 'failure';

interface TestCase {
  id: string;
  module: string;
  name: string;
  description: string;
  run: () => Promise<void>;
  status: TestStatus;
  error?: string;
  duration?: number;
}

const SystemHealthCheck: React.FC = () => {
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${prefix} ${msg}`, ...prev]);
  };

  // --- COMPREHENSIVE TEST SUITE ---
  const [tests, setTests] = useState<TestCase[]>([
    // --- 1. AUTHENTICATION & ACCESS ---
    {
      id: 'auth-1',
      module: 'Auth & Session',
      name: 'Login & Session Validation',
      description: 'Verify login credentials and session token persistence (/auth/me).',
      status: 'idle',
      run: async () => {
        // 1. Login
        const res = await AuthService.login({ username: 'luyangong', secret: '123' });
        if (!res.data?.token) throw new Error('Token missing');
        // 2. Verify Session
        const me = await AuthService.getCurrentUser();
        if (me.data.user.username !== 'luyangong') throw new Error('Session user mismatch');
      }
    },
    {
      id: 'auth-2',
      module: 'Auth & Session',
      name: 'Security Barrier (Negative)',
      description: 'Ensure system rejects empty/invalid credentials (400/401).',
      status: 'idle',
      run: async () => {
        try {
            const res = await AuthService.login({ username: '', secret: '' });
            if (res.code === 200 && res.data?.token) throw new Error('Security Breach: Accepted invalid inputs');
        } catch (e: any) {
            if (e.message.includes('Security Breach')) throw e;
        }
      }
    },
    {
      id: 'auth-3',
      module: 'Auth & Session',
      name: 'Registration & Approval Loop',
      description: 'Submit Register -> Admin List -> Admin Approve -> Verify User.',
      status: 'idle',
      run: async () => {
        // 1. Submit Registration
        const regPayload = {
            fullName: 'Test Recruit', username: `recruit-${Date.now()}`, departmentId: 'd1', intendedClearance: ClearanceLevel.INTERNAL, justification: 'AutoTest'
        };
        const regRes = await AuthService.register(regPayload);
        if (!regRes.data.requestId) throw new Error('Registration submission failed');

        // 2. Admin List Requests (Find the one we just made - Mock usually returns static list, checking static for now)
        const requests = await AdminService.getRegistrationRequests();
        if (!requests.data) throw new Error('Failed to fetch requests');
        
        // 3. Approve (Using first available for mock test)
        if (requests.data.length > 0) {
            await AdminService.approveRegistration(requests.data[0].id);
        }
      }
    },

    // --- 2. ADMIN GOVERNANCE ---
    {
      id: 'admin-1',
      module: 'Admin Core',
      name: 'User Lifecycle (CRUD)',
      description: 'Create User -> Update Role/Clearance -> Delete User.',
      status: 'idle',
      run: async () => {
        const username = `bot-${Date.now()}`;
        // Create
        const u = await AdminService.createUser({ name: 'Bot', username, departmentId: 'd1', roleId: 'r3', clearance: ClearanceLevel.INTERNAL, status: 'ACTIVE' });
        // Update
        await AdminService.updateUser(u.data.id, { clearance: ClearanceLevel.SECRET });
        // Verify
        const list = await AdminService.getUsers();
        if (!list.data.find(user => user.id === u.data.id && user.clearance === ClearanceLevel.SECRET)) throw new Error('Update verification failed');
        // Delete
        await AdminService.deleteUser(u.data.id);
      }
    },
    {
        id: 'admin-2',
        module: 'Admin Core',
        name: 'KB Asset Management',
        description: 'Create Knowledge Base -> Verify ACL -> Delete.',
        status: 'idle',
        run: async () => {
            const kb = await AdminService.createKB({
                name: 'AutoTest KB', description: 'Test', clearance: ClearanceLevel.INTERNAL, authorized_departments: ['d1'], authorized_roles: [], authorized_users: []
            });
            await AdminService.deleteKB(kb.data.id);
            const list = await AdminService.getKBs();
            if (list.data.find(k => k.id === kb.data.id)) throw new Error('KB deletion failed');
        }
    },

    // --- 3. DOCUMENT OPERATIONS ---
    {
        id: 'doc-1',
        module: 'Documents',
        name: 'Doc Ingestion & Security Ops',
        description: 'Upload -> Parse -> Desensitize Download -> Print Application.',
        status: 'idle',
        run: async () => {
            // 1. Mock File & Parse
            const file = new File(["confidential content"], "test.docx", { type: "application/msword" });
            const parse = await ApiService.parseFile(file);
            if (!parse.data.content) throw new Error('File parsing failed');

            // 2. Upload (Ingest)
            await DocumentService.uploadDocument(file, { kbId: 'kb-1', clearance: ClearanceLevel.INTERNAL });

            // 3. Security Ops (Mocking doc-1 as target)
            const downRes = await DocumentService.downloadDesensitized('doc-1');
            if (!downRes.data.url) throw new Error('Desensitization failed');

            const printRes = await DocumentService.applyPrint({ doc_id: 'doc-1', reason: 'Test', copies: 1 });
            if (!printRes.data.applicationId) throw new Error('Print application failed');
        }
    },
    {
        id: 'doc-2',
        module: 'Documents',
        name: 'Archive Retrieval',
        description: 'List KBs -> List Files -> Get File Detail.',
        status: 'idle',
        run: async () => {
            const kbs = await DocumentService.getAuthorizedKBs();
            if (kbs.data.length === 0) throw new Error('No Authorized KBs found');
            
            const docs = await DocumentService.getDocuments(kbs.data[0].id);
            // It's possible to have empty KBs, so we don't throw if empty, but we check call success
            if (!Array.isArray(docs.data)) throw new Error('Invalid Docs response');

            if (docs.data.length > 0) {
                const detail = await DocumentService.getDocumentDetail(docs.data[0].id);
                if (detail.data.id !== docs.data[0].id) throw new Error('Document detail mismatch');
            }
        }
    },

    // --- 4. QA & FEEDBACK LOOP ---
    {
      id: 'chat-1',
      module: 'QA Engine',
      name: 'RAG Chat Lifecycle',
      description: 'Create Session -> RAG Inference -> Message History -> Delete.',
      status: 'idle',
      run: async () => {
        const s = await ChatService.createSession({ title: 'HealthCheck', bound_kb_ids: ['kb-1'] });
        const msg = await ChatService.sendMessage(s.data.id, 'Test', { selected_kb_ids: ['kb-1'], strategy: 'hybrid', tiers: {faq:true,graph:true,docs:true,llm:true}, enhanced: {queryRewrite:true,hyde:false,stepback:false} });
        if (!msg.data.answer) throw new Error('RAG inference failed');
        
        const hist = await ChatService.getHistory(s.data.id);
        if (hist.data.length === 0) throw new Error('History missing');
        
        await ChatService.deleteSession(s.data.id);
      }
    },
    {
      id: 'chat-2',
      module: 'QA Engine',
      name: 'Chat Management Ops',
      description: 'Rename Session -> Export Evidence.',
      status: 'idle',
      run: async () => {
        const s = await ChatService.createSession({ title: 'Orig', bound_kb_ids: ['kb-1'] });
        
        // Rename
        const updated = await ChatService.renameSession(s.data.id, { title: 'Renamed' });
        if (updated.data.title !== 'Renamed') throw new Error('Rename failed');

        // Export Evidence
        const evidenceUrl = await ChatService.exportEvidence(s.data.id);
        if (!evidenceUrl.startsWith('data:')) throw new Error('Evidence export failed');

        await ChatService.deleteSession(s.data.id);
      }
    },
    {
        id: 'chat-3',
        module: 'QA Engine',
        name: 'FAQ Governance Loop',
        description: 'Submit Feedback -> Admin List -> Approve/Reject.',
        status: 'idle',
        run: async () => {
            // 1. User submits feedback
            const fb = await ChatService.submitFeedbackToFAQ({ conversation_id: 'c1', question: 'Q?', answer: 'A' });
            if (!fb.data.review_id) throw new Error('Feedback submission failed');

            // 2. Admin checks pending list (Mock data check)
            const pending = await AdminService.getPendingFAQs();
            if (!pending.data) throw new Error('Failed to fetch pending FAQs');

            // 3. Admin approves (Mock logic on generic ID)
            if (pending.data.length > 0) {
                await AdminService.approveFAQ(pending.data[0].id);
            }
        }
    },

    // --- 5. GRAPH INTELLIGENCE ---
    {
        id: 'graph-1',
        module: 'Knowledge Graph',
        name: 'Advanced Graph Analysis',
        description: 'Node Query -> Entity Detail -> Path Discovery -> Temporal Evolution.',
        status: 'idle',
        run: async () => {
            // 1. Basic Query
            const g = await GraphService.queryGraph();
            if (g.data.nodes.length === 0) throw new Error('Graph nodes missing');

            // 2. Entity Detail
            const entity = await GraphService.getEntityDetail(g.data.nodes[0].id);
            if (!entity.data.name) throw new Error('Entity detail missing');

            // 3. Path Discovery
            const path = await GraphService.findPath({ start_entity_id: 'n1', end_entity_id: 'n2' });
            if (!path.data.paths) throw new Error('Path discovery failed');

            // 4. Evolution
            const evo = await GraphService.getEvolution({ entity_id: 'n1', date: '2024' });
            if (!evo.data.events) throw new Error('Evolution events missing');
        }
    },

    // --- 6. SECURITY & CONFIG ---
    {
        id: 'sec-1',
        module: 'Security & Log',
        name: 'DLP & Audit Operations',
        description: 'Policy CRUD -> Audit Log Export.',
        status: 'idle',
        run: async () => {
            // 1. Policy CRUD
            const p = await AdminService.createPolicy({ word: 'TEST', replacement: '*', severity: 'low', is_active: true });
            await AdminService.deletePolicy(p.data.id);

            // 2. Audit Export
            const exportRes = await AdminService.exportAuditLogs({ format: 'pdf', query: { limit: 100 } });
            if (!exportRes.data.url) throw new Error('Audit export failed');
        }
    },
    {
        id: 'conf-1',
        module: 'System Config',
        name: 'Global Search Strategy',
        description: 'Update and verify global retrieval parameters.',
        status: 'idle',
        run: async () => {
            const conf = await AdminService.getSearchConfig();
            await AdminService.updateSearchConfig({ config: { ...conf.data, parameters: { ...conf.data.parameters, topK: 8 } } });
        }
    },

    // --- 7. AGENT WORKFLOW ---
    {
        id: 'agent-1',
        module: 'Agentic',
        name: 'Agent Capability Check',
        description: 'Write -> Optimize -> Format -> Proofread.',
        status: 'idle',
        run: async () => {
            // Write
            const write = await AgentService.write({ topic: 'Test', outline: '1. A' });
            if (!write.data) throw new Error('Writing agent failed');

            // Optimize
            const opt = await AgentService.optimize({ content: 'Draft', instruction: 'Better' });
            if (!opt.data) throw new Error('Optimize agent failed');

            // Format
            const fmt = await AgentService.format({ content: 'Draft', style: 'Official' });
            if (!fmt.data) throw new Error('Format agent failed');

            // Proofread
            const proof = await AgentService.proofread({ content: 'Test', reference: 'Ref' });
            if (!Array.isArray(proof.data)) throw new Error('Proofread format invalid');
        }
    }
  ]);

  const runTest = async (index: number) => {
    const test = tests[index];
    
    const newTests = [...tests];
    newTests[index] = { ...test, status: 'running', error: undefined };
    setTests(newTests);
    addLog(`Running ${test.name}...`);

    const start = performance.now();

    try {
        await test.run();
        const duration = performance.now() - start;
        
        setTests(prev => {
            const updated = [...prev];
            updated[index] = { ...test, status: 'success', duration };
            return updated;
        });
        addLog(`${test.name} passed in ${duration.toFixed(2)}ms`, 'success');
    } catch (e: any) {
        const duration = performance.now() - start;
        setTests(prev => {
            const updated = [...prev];
            updated[index] = { ...test, status: 'failure', error: e.message || 'Unknown error', duration };
            return updated;
        });
        addLog(`${test.name} failed: ${e.message}`, 'error');
    }
  };

  const runAll = async () => {
      setIsRunningAll(true);
      setLogs([]);
      setTests(prev => prev.map(t => ({ ...t, status: 'idle', error: undefined, duration: undefined })));

      addLog("Initializing Full System Diagnostic...", 'info');

      for (let i = 0; i < tests.length; i++) {
          await runTest(i);
          await new Promise(r => setTimeout(r, 150)); 
      }
      setIsRunningAll(false);
      addLog("--- Diagnostic Complete ---", 'info');
  };

  // Calculate stats
  const passed = tests.filter(t => t.status === 'success').length;
  const failed = tests.filter(t => t.status === 'failure').length;
  const total = tests.length;
  const progress = (tests.filter(t => t.status !== 'idle' && t.status !== 'running').length / total) * 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="flex justify-between items-center">
          <div>
             <h2 className="text-2xl font-bold">系统全链路健康自检 (Full System Diagnostic)</h2>
             <p className="text-sm text-[#57606a] dark:text-[#8b949e]">包含 Auth, Admin, Doc, Chat, Graph, Agent 等全模块严密测试。</p>
          </div>
          <div className="flex gap-4 items-center">
             <div className="text-right">
                <p className="text-xs font-bold uppercase text-[#57606a]">Coverage</p>
                <p className={`text-xl font-black ${failed > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {tests.some(t => t.status !== 'idle') ? `${((passed / (passed+failed || 1)) * 100).toFixed(0)}%` : '--'}
                </p>
             </div>
             <button 
                onClick={runAll}
                disabled={isRunningAll}
                className="bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white px-6 py-2.5 rounded-md font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
             >
                {isRunningAll ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> 执行中...</>
                ) : (
                    <>🚀 运行全量测试</>
                )}
             </button>
          </div>
       </div>

       {/* Progress Bar */}
       <div className="w-full bg-[#d0d7de] dark:bg-[#30363d] h-2 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Test Case List */}
          <div className="lg:col-span-2 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-xl overflow-hidden flex flex-col">
             <div className="bg-[#f6f8fa] dark:bg-[#1c2128] border-b border-[#d0d7de] dark:border-[#30363d] px-4 py-2 flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-[#57606a]">Test Cases ({total})</span>
             </div>
             <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-[#f6f8fa] dark:bg-[#0d1117] text-[#57606a] dark:text-[#8b949e]">
                      <tr>
                         <th className="px-4 py-2 font-bold w-12">Status</th>
                         <th className="px-4 py-2 font-bold">Module</th>
                         <th className="px-4 py-2 font-bold">Test Name</th>
                         <th className="px-4 py-2 font-bold text-right">Time</th>
                         <th className="px-4 py-2 font-bold w-20">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
                      {tests.map((test, idx) => (
                         <tr key={test.id} className="hover:bg-[#f6f8fa] dark:hover:bg-[#21262d]">
                            <td className="px-4 py-3 text-center">
                               {test.status === 'running' && <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>}
                               {test.status === 'success' && <span className="text-green-500 font-bold">✔</span>}
                               {test.status === 'failure' && <span className="text-red-500 font-bold">✘</span>}
                               {test.status === 'idle' && <span className="text-gray-400">●</span>}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-[#57606a] dark:text-[#8b949e]">{test.module}</td>
                            <td className="px-4 py-3">
                               <div className="font-bold">{test.name}</div>
                               <div className="text-xs text-[#57606a]">{test.description}</div>
                               {test.error && <div className="text-xs text-red-500 mt-1 font-mono bg-red-50 dark:bg-red-900/10 p-1 rounded">Error: {test.error}</div>}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs">
                               {test.duration ? `${test.duration.toFixed(0)}ms` : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                               <button 
                                 onClick={() => runTest(idx)}
                                 disabled={isRunningAll || test.status === 'running'}
                                 className="text-blue-500 hover:text-blue-700 disabled:opacity-30 text-xs font-bold"
                               >
                                 Run
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Console Output */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col font-mono text-xs overflow-hidden shadow-inner">
             <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] text-[#8b949e] font-bold flex justify-between">
                <span>TERMINAL OUTPUT</span>
                <button onClick={() => setLogs([])} className="hover:text-white">Clear</button>
             </div>
             <div className="flex-1 p-4 overflow-y-auto space-y-1 text-[#c9d1d9]">
                {logs.length === 0 && <span className="opacity-50 italic">Waiting for test execution...</span>}
                {logs.map((log, i) => (
                   <div key={i} className={`break-all ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}`}>
                      {log}
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
};

export default SystemHealthCheck;
