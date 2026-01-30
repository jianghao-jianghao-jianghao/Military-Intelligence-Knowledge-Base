import { 
  FileParseResult, 
  WeaponDocument, 
  ApiResponse, 
  ClearanceLevel, 
  User, 
  AuditLog, 
  ProofreadSuggestion,
  Conversation,
  Message,
  CreateChatRequest,
  UpdateChatRequest,
  RetrievalConfig,
  QAResponse,
  UserRole,
  RegisterUserRequest,
  FAQFeedbackRequest,
  GraphData,
  GraphQueryRequest,
  EntityDetail,
  PathDiscoveryRequest,
  PathDiscoveryResult,
  EvolutionRequest,
  EvolutionSnapshot,
  KnowledgeBase,
  PrintApplicationRequest,
  AgentWriteRequest,
  AgentOptimizeRequest,
  AgentProofreadRequest,
  AgentFormatRequest,
  RegistrationRequest,
  SensitiveWordPolicy,
  FAQPair,
  CreateUserRequest,
  UpdateUserRequest,
  AuditStatus,
  CreateKBRequest,
  UpdateKBRequest,
  CreateFAQRequest,
  UpdateFAQRequest,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  GlobalSearchConfig,
  UpdateSearchConfigRequest,
  AuditLogQuery,
  AuditExportRequest
} from "../types.ts";
import { MOCK_KBS, MOCK_DOCS, MOCK_AUDIT_LOGS, MOCK_USERS, MOCK_POLICIES, MOCK_FAQS, MOCK_ROLES } from '../constants.tsx';

/**
 * Service Layer: api.ts
 * Interacts with the FastAPI Backend.
 * 
 * VITE_API_BASE_URL should be set in .env, defaults to http://localhost:8000/api/v1
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// Custom Error Class for API handling
export class ApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

// Helper to construct headers with Auth Token
const getHeaders = (isMultipart = false) => {
  const headers: HeadersInit = {};
  const token = localStorage.getItem("auth_token"); // Standard JWT storage
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // For multipart/form-data (file uploads), browser sets Content-Type boundary automatically
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  
  return headers;
};

// --- MOCK DATA STORE (In-Memory for Demo Session) ---
// Initialize mutable mock data from constants
let mockUsers = [...MOCK_USERS];
let mockKbs = [...MOCK_KBS];
let mockPolicies = [...MOCK_POLICIES];
let mockFaqs = [...MOCK_FAQS];
let mockSearchConfig: GlobalSearchConfig = {
    strategy: 'hybrid',
    tiers: { faq: true, graph: true, docs: true, llm: true },
    enhanced: { queryRewrite: true, hyde: false, stepback: true },
    parameters: { topK: 5, threshold: 0.75 }
};
let mockRegistrationRequests: RegistrationRequest[] = [
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
];

const mockConversations: Conversation[] = [
  {
     id: 'c1-demo', 
     title: '15式坦克高原性能分析 (Demo)', 
     user_id: '1',
     created_at: new Date().toISOString(), 
     updated_at: new Date().toISOString(), 
     bound_kb_ids: ['kb-1'], 
     messages: [
        {
          id: 'm1',
          role: 'user',
          content: '15式轻型坦克的高原机动性如何？',
          timestamp: new Date(Date.now() - 1000000).toISOString()
        },
        {
          id: 'm2',
          role: 'assistant',
          content: '15式轻型坦克（ZTQ-15）专为高原山地作战设计。根据装甲动力核心指标库（KB-1）数据，其采用的 1000马力级柴油发动机 配合二级涡轮增压系统，在海拔4500米地区功率衰减不超过12%。\n\n相比之下，99A主战坦克在同等海拔下功率衰减接近30%。此外，15式采用的液气悬挂系统极大提升了山地通过性。',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          qaResponse: {
             answer: '15式轻型坦克（ZTQ-15）专为高原山地作战设计。根据装甲动力核心指标库（KB-1）数据，其采用的 1000马力级柴油发动机 配合二级涡轮增压系统，在海拔4500米地区功率衰减不超过12%。\n\n相比之下，99A主战坦克在同等海拔下功率衰减接近30%。此外，15式采用的液气悬挂系统极大提升了山地通过性。',
             confidence: 0.98,
             security_badge: ClearanceLevel.SECRET,
             is_desensitized: false,
             thought_process: [
               { title: '语义解析', content: '提取关键词：15式坦克、高原、机动性', type: 'reason' },
               { title: '知识图谱路由', content: '定位实体 ID: ENT-ZTQ15 -> 关联属性: engine_performance_high_altitude', type: 'graph_traversal' },
               { title: '文档切片召回', content: '召回《15式轻坦高原发动机热力分析》第3章数据', type: 'search' }
             ],
             provenance: [
               {
                 sentence_id: 'p1',
                 source_type: 'DOCS',
                 source_name: '15式轻坦高原发动机热力分析.pdf',
                 doc_id: 'doc-1',
                 text: '实验表明，通过二级涡轮增压补偿，额定功率在4500m海拔保持率>88%。',
                 score: 0.95,
                 security_level: ClearanceLevel.SECRET,
                 start: 102,
                 end: 154
               },
               {
                 sentence_id: 'p2',
                 source_type: 'KG',
                 source_name: '装备本体图谱',
                 text: '实体关系：15式坦克 --[装备]--> 液气悬挂系统',
                 score: 0.99,
                 security_level: ClearanceLevel.INTERNAL
               }
             ]
          }
        }
     ]
  }
];

/**
 * Mock Request Handler
 * Returns simulated responses when the real backend is unavailable.
 */
async function mockRequest<T>(endpoint: string, options: RequestInit): Promise<ApiResponse<T>> {
    console.warn(`[Mock Mode] Serving request for: ${endpoint}`);
    await new Promise(r => setTimeout(r, 400)); // Reduced latency for faster tests

    // --- ADMIN MOCKS ---
    if (endpoint === '/admin/registrations') {
        return { code: 200, message: 'OK', data: mockRegistrationRequests as any };
    }
    
    if (endpoint.match(/\/admin\/registrations\/(.+)\/(approve|reject)/)) {
        const parts = endpoint.split('/');
        const id = parts[3];
        const action = parts[4];
        
        mockRegistrationRequests = mockRegistrationRequests.filter(r => r.id !== id);
        
        // If approve, create user (simplified mock logic)
        if (action === 'approve') {
             const newId = `u-${Date.now()}`;
             mockUsers.push({
                 id: newId,
                 name: 'Mock User',
                 username: 'mockuser',
                 role: UserRole.USER,
                 roleId: 'r3',
                 departmentId: 'd1',
                 clearance: ClearanceLevel.INTERNAL,
                 status: 'ACTIVE'
             });
        }
        return { code: 200, message: 'OK', data: true as any };
    }

    if (endpoint === '/admin/users' && (!options.method || options.method === 'GET')) {
        return { code: 200, message: 'OK', data: mockUsers as any };
    }

    if (endpoint === '/admin/users' && options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newUser: User = {
            id: `u-${Date.now()}`,
            name: body.name,
            username: body.username,
            roleId: body.roleId,
            role: UserRole.USER, 
            departmentId: body.departmentId,
            clearance: body.clearance,
            status: body.status || 'ACTIVE'
        };
        mockUsers.push(newUser);
        return { code: 200, message: 'OK', data: newUser as any };
    }

    if (endpoint.match(/\/admin\/users\/(.+)/) && options.method === 'PUT') {
        const id = endpoint.split('/')[3];
        const body = JSON.parse(options.body as string);
        const idx = mockUsers.findIndex(u => u.id === id);
        if (idx !== -1) {
            mockUsers[idx] = { ...mockUsers[idx], ...body };
            return { code: 200, message: 'OK', data: mockUsers[idx] as any };
        }
        return { code: 404, message: 'User not found', data: null as any };
    }

    // Fix: Added missing delete user mock
    if (endpoint.match(/\/admin\/users\/(.+)/) && options.method === 'DELETE') {
        const id = endpoint.split('/')[3];
        mockUsers = mockUsers.filter(u => u.id !== id);
        return { code: 200, message: 'OK', data: true as any };
    }

    if (endpoint === '/admin/policies') {
        if (options.method === 'POST') {
             const body = JSON.parse(options.body as string);
             const pol = { ...body, id: `p-${Date.now()}` };
             mockPolicies.push(pol);
             return { code: 200, message: 'OK', data: pol as any };
        }
        return { code: 200, message: 'OK', data: mockPolicies as any };
    }

    if (endpoint.match(/\/admin\/policies\/(.+)/) && options.method === 'DELETE') {
        const id = endpoint.split('/')[3];
        mockPolicies = mockPolicies.filter(p => p.id !== id);
        return { code: 200, message: 'OK', data: true as any };
    }

    if (endpoint.match(/\/admin\/policies\/(.+)/) && options.method === 'PUT') {
         const id = endpoint.split('/')[3];
         const body = JSON.parse(options.body as string);
         const idx = mockPolicies.findIndex(p => p.id === id);
         if (idx !== -1) {
             mockPolicies[idx] = { ...mockPolicies[idx], ...body };
             return { code: 200, message: 'OK', data: mockPolicies[idx] as any };
         }
    }

    if (endpoint === '/admin/search-config') {
        if (options.method === 'PUT') {
            const body = JSON.parse(options.body as string);
            mockSearchConfig = body.config;
            return { code: 200, message: 'OK', data: mockSearchConfig as any };
        }
        return { code: 200, message: 'OK', data: mockSearchConfig as any };
    }

    if (endpoint.startsWith('/admin/audit-logs/export')) {
        return { code: 200, message: 'OK', data: { url: 'data:application/pdf;base64,MOCK_PDF_DATA' } as any };
    }

    // KB Mocks
    if (endpoint === '/admin/kbs') {
        if (options.method === 'POST') {
            const body = JSON.parse(options.body as string);
            const kb: KnowledgeBase = { ...body, id: `kb-${Date.now()}`, created_at: new Date().toISOString() };
            mockKbs.push(kb);
            return { code: 200, message: 'OK', data: kb as any };
        }
        return { code: 200, message: 'OK', data: mockKbs as any };
    }
    
    if (endpoint.match(/\/admin\/kbs\/(.+)/) && options.method === 'PUT') {
        const id = endpoint.split('/')[3];
        const body = JSON.parse(options.body as string);
        const idx = mockKbs.findIndex(k => k.id === id);
        if(idx !== -1) {
            mockKbs[idx] = { ...mockKbs[idx], ...body };
            return { code: 200, message: 'OK', data: mockKbs[idx] as any };
        }
    }

    if (endpoint.match(/\/admin\/kbs\/(.+)/) && options.method === 'DELETE') {
        const id = endpoint.split('/')[3];
        mockKbs = mockKbs.filter(k => k.id !== id);
        return { code: 200, message: 'OK', data: true as any };
    }

    // FAQ Mocks
    if (endpoint === '/admin/faqs') {
        if (options.method === 'POST') {
            const body = JSON.parse(options.body as string);
            const faq: FAQPair = { 
                ...body, 
                id: `faq-${Date.now()}`, 
                status: AuditStatus.APPROVED, 
                lastUpdated: new Date().toISOString().split('T')[0],
                suggestedBy: '管理员'
            };
            mockFaqs.unshift(faq);
            return { code: 200, message: 'OK', data: faq as any };
        }
    }

    if (endpoint === '/admin/faqs/pending') {
         return { code: 200, message: 'OK', data: mockFaqs.filter(f => f.status === AuditStatus.PENDING) as any };
    }
    
    if (endpoint.match(/\/admin\/faqs\/(.+)\/approve/)) {
        const id = endpoint.split('/')[3];
        const idx = mockFaqs.findIndex(f => f.id === id);
        if (idx !== -1) mockFaqs[idx].status = AuditStatus.APPROVED;
        return { code: 200, message: 'OK', data: true as any };
    }

    if (endpoint.match(/\/admin\/faqs\/(.+)\/reject/)) {
        const id = endpoint.split('/')[3];
        const idx = mockFaqs.findIndex(f => f.id === id);
        if (idx !== -1) mockFaqs[idx].status = AuditStatus.REJECTED;
        return { code: 200, message: 'OK', data: true as any };
    }

    if (endpoint.match(/\/admin\/faqs\/(.+)/) && options.method === 'PUT') {
        const id = endpoint.split('/')[3];
        const body = JSON.parse(options.body as string);
        const idx = mockFaqs.findIndex(f => f.id === id);
        if (idx !== -1) {
            mockFaqs[idx] = { ...mockFaqs[idx], ...body, lastUpdated: new Date().toISOString().split('T')[0] };
            return { code: 200, message: 'OK', data: mockFaqs[idx] as any };
        }
    }

    if (endpoint.match(/\/admin\/faqs\/(.+)/) && options.method === 'DELETE') {
        const id = endpoint.split('/')[3];
        mockFaqs = mockFaqs.filter(f => f.id !== id);
        return { code: 200, message: 'OK', data: true as any };
    }

    // --- DOCUMENTS MOCKS ---
    if (endpoint === '/documents/kbs') {
        return { code: 200, message: 'OK', data: mockKbs as any }; 
    }

    if (endpoint.match(/\/documents\/kbs\/(.+)\/files/)) {
        const kbId = endpoint.split('/')[3];
        const docs = MOCK_DOCS.filter(d => d.kb_id === kbId);
        return { code: 200, message: 'OK', data: docs as any };
    }

    if (endpoint.match(/\/documents\/(.+)\/desensitize/)) {
        return { code: 200, message: 'OK', data: { url: "data:text/plain;charset=utf-8,MOCK_DESENSITIZED_FILE_CONTENT" } as any };
    }
    
    if (endpoint.match(/\/documents\/(.+)\/print/)) {
        return { code: 200, message: 'OK', data: { applicationId: `print-app-${Date.now()}` } as any };
    }

    if (endpoint === '/files/parse') {
        return { 
          code: 200, 
          message: 'OK', 
          data: { 
             fileName: 'mock_upload.docx',
             fileType: 'DOCX',
             content: '这是从上传文件解析出的模拟文本内容。\n\n在真实后端中，此步骤会调用 Apache Tika 或 OCR 服务提取文档中的文字和元数据。\n\n[示例段落 1] 装备研制流程必须遵循严格的质量控制标准。\n[示例段落 2] 所有涉密数据必须经过脱敏处理方可用于非密环境。',
             metadata: { pageCount: 5, author: '系统自动解析', detectedType: '技术文档' }
          } as any 
        };
    }

    // --- GRAPH MOCKS ---
    if (endpoint === '/graph/query') {
        const data: GraphData = {
            nodes: [
                { id: 'n1', label: '15式轻型坦克', type: 'WEAPON', x: 0, y: 0, color: '#0366d6' },
                { id: 'n2', label: '北方工业', type: 'MANUFACTURER', x: 200, y: -100, color: '#1c2128' },
                { id: 'n3', label: '先进动力系统', type: 'SYSTEM', x: 180, y: 120, color: '#1c2128' },
                { id: 'n4', label: '105mm 膛线炮', type: 'ARMAMENT', x: -150, y: 150, color: '#1c2128' }
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2', label: '研制单位' },
                { id: 'e2', source: 'n1', target: 'n3', label: '动力系统' },
                { id: 'e3', source: 'n1', target: 'n4', label: '主武器' }
            ]
        };
        return { code: 200, message: 'OK', data: data as any };
    }

    if (endpoint.match(/\/graph\/entities\/(.+)$/)) {
        const id = endpoint.split('/').pop();
        const detail: EntityDetail = {
            id: id || 'n1',
            name: '15式轻型坦克 (ZTQ-15)',
            type: 'WEAPON',
            attributes: [
                { key: '研制单位', value: '北方工业' },
                { key: '密级', value: '机密 (SECRET)' },
                { key: '战斗全重', value: '33 - 36吨' },
                { key: '最大速度', value: '70 km/h (公路)' }
            ],
            related_docs: MOCK_DOCS.filter(d => d.kb_id === 'kb-1')
        };
        return { code: 200, message: 'OK', data: detail as any };
    }

    if (endpoint === '/graph/path') {
        const data: PathDiscoveryResult = {
            paths: [
                {
                    nodes: [
                        { id: 'n1', label: '15式坦克', type: 'WEAPON' },
                        { id: 'n2', label: '北方工业', type: 'MANUFACTURER' },
                        { id: 'n99', label: '某型外贸主战坦克', type: 'WEAPON' }
                    ],
                    edges: [
                        { id: 'e1', source: 'n1', target: 'n2', label: '研制单位' },
                        { id: 'e_path', source: 'n2', target: 'n99', label: '研制单位' }
                    ]
                }
            ]
        };
        return { code: 200, message: 'OK', data: data as any };
    }

    // Fix: Use startsWith to handle query params like ?date=2024
    if (endpoint.startsWith('/graph/evolution')) {
        const urlParts = endpoint.split('?');
        const queryParams = new URLSearchParams(urlParts.length > 1 ? urlParts[1] : '');
        const date = queryParams.get('date') || '2024';
        
        const snapshot: GraphData = {
             nodes: [
                 { id: 'n1', label: '15式轻型坦克', type: 'WEAPON', x: 0, y: 0 },
                 { id: 'n5', label: '早期原型车-01', type: 'PROTOTYPE', x: -200, y: 0 }
             ],
             edges: [
                 { id: 'e_evo', source: 'n5', target: 'n1', label: '演进' }
             ]
        };

        const result: EvolutionSnapshot = {
            date: date,
            snapshot: snapshot,
            events: [
                { date: '2012', title: '立项', description: '高原轻坦项目正式立项' },
                { date: '2016', title: '定型', description: '完成寒区/高原测试' },
                { date: '2018', title: '列装', description: '正式进入序列' }
            ]
        };
        return { code: 200, message: 'OK', data: result as any };
    }

    // --- AUTH MOCKS ---
    if (endpoint === '/auth/login') {
        // Fix: Validate credentials to allow negative testing
        const body = options.body ? JSON.parse(options.body as string) : {};
        if (!body.username || !body.secret) {
             return { code: 400, message: 'Invalid credentials provided', data: null as any };
        }

        return { 
          code: 200, 
          message: 'OK', 
          data: { 
            token: 'mock-jwt-token-xyz', 
            user: { 
              id: '1', 
              name: '陆研工', 
              username: 'luyangong', 
              role: UserRole.SUPER_ADMIN, 
              roleId: 'r1', 
              departmentId: 'd1', 
              clearance: ClearanceLevel.SECRET, 
              status: 'ACTIVE' 
            } 
          } as any 
        };
    }
    
    if (endpoint === '/auth/register') {
        return { 
          code: 200, 
          message: 'OK', 
          data: { requestId: `req-${Date.now()}`, status: 'PENDING' } as any 
        };
    }

    if (endpoint === '/auth/me') {
        const token = localStorage.getItem('auth_token');
        if (!token) return { code: 401, message: 'Unauthorized', data: null as any };
        return { 
          code: 200, 
          message: 'OK', 
          data: { 
            user: { 
              id: '1', 
              name: '陆研工 (Session)', 
              username: 'luyangong', 
              role: UserRole.SUPER_ADMIN, 
              roleId: 'r1', 
              departmentId: 'd1', 
              clearance: ClearanceLevel.SECRET, 
              status: 'ACTIVE' 
            } 
          } as any 
        };
    }

    if (endpoint === '/auth/logout') {
        return { code: 200, message: 'OK', data: true as any };
    }

    // --- CHAT MOCKS ---
    if (endpoint === '/chat/sessions' && (!options.method || options.method === 'GET')) {
        return { code: 200, message: 'OK', data: [...mockConversations] as any };
    }

    if (endpoint === '/chat/sessions' && options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newConv: Conversation = {
            id: `c-${Date.now()}`,
            title: body.title || '新会话',
            user_id: '1',
            bound_kb_ids: body.bound_kb_ids || [],
            messages: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        mockConversations.unshift(newConv);
        return { code: 200, message: 'OK', data: newConv as any };
    }

    const deleteMatch = endpoint.match(/\/chat\/sessions\/(.+)$/);
    if (deleteMatch && options.method === 'DELETE') {
        const id = deleteMatch[1];
        const idx = mockConversations.findIndex(c => c.id === id);
        if (idx !== -1) mockConversations.splice(idx, 1);
        return { code: 200, message: 'OK', data: true as any };
    }

    if (deleteMatch && options.method === 'PATCH') {
        const id = deleteMatch[1];
        const body = JSON.parse(options.body as string);
        const conv = mockConversations.find(c => c.id === id);
        if (conv && body.title) conv.title = body.title;
        return { code: 200, message: 'OK', data: conv as any };
    }

    const historyMatch = endpoint.match(/\/chat\/sessions\/(.+)\/messages$/);
    if (historyMatch && (!options.method || options.method === 'GET')) {
        const id = historyMatch[1];
        const conv = mockConversations.find(c => c.id === id);
        return { code: 200, message: 'OK', data: (conv ? conv.messages : []) as any };
    }

    if (historyMatch && options.method === 'POST') {
        const id = historyMatch[1];
        const body = JSON.parse(options.body as string);
        const conv = mockConversations.find(c => c.id === id);
        
        const responseData: QAResponse = {
           answer: `[模拟演示模式] 后端连接不可用，已启用离线回复生成。\n\n针对您的提问："${body.query}"，系统基于所选知识库（${conv?.bound_kb_ids.length ? conv.bound_kb_ids.join(', ') : '未绑定'}）进行了模拟检索。\n\n在真实环境中，此步骤将调用 PostgreSQL pgvector 进行向量匹配，并结合 Apache AGE 进行图谱推理。`,
           confidence: 0.85,
           security_badge: ClearanceLevel.INTERNAL,
           is_desensitized: true,
           thought_process: [
             { title: '系统状态检查', content: '检测到 API 网关不可达 (Connection Refused)', type: 'verify' },
             { title: '服务降级', content: '切换至前端 Mock 引擎', type: 'reason' },
             { title: '虚拟检索', content: '模拟召回 3 条相关度 > 0.8 的记录', type: 'search' }
           ],
           provenance: [
             {
               sentence_id: `p-${Date.now()}`,
               source_type: 'DOCS',
               source_name: '系统演示说明.pdf',
               doc_id: 'doc-1',
               text: '本系统在离线状态下仅展示 UI 交互流程，不进行真实的模型推理。',
               score: 0.99,
               security_level: ClearanceLevel.UNCLASSIFIED
             }
           ]
        };
        
        if (conv) {
             conv.messages.push({ id: `u-${Date.now()}`, role: 'user', content: body.query, timestamp: new Date().toISOString() });
             conv.messages.push({ id: `a-${Date.now()}`, role: 'assistant', content: responseData.answer, qaResponse: responseData, timestamp: new Date().toISOString() });
        }

        return { code: 200, message: 'OK', data: responseData as any };
    }

    // FAQ Feedback Mock
    if (endpoint === '/chat/feedback/faq' && options.method === 'POST') {
        return { code: 200, message: 'OK', data: { review_id: `rev-${Date.now()}` } as any };
    }
    
    if (endpoint.startsWith('/admin/audit-logs')) {
        return { code: 200, message: 'OK', data: MOCK_AUDIT_LOGS as any };
    }

    if (endpoint.startsWith('/documents/')) {
        const id = endpoint.split('/').pop();
        const doc = MOCK_DOCS.find(d => d.id === id);
        return { code: 200, message: 'OK', data: doc as any };
    }
    
    if (endpoint.startsWith('/agent/')) {
        if (endpoint.includes('proofread')) {
             return { code: 200, message: 'OK', data: [
                 { id: 1, type: 'typo', original: '痛知', suggestion: '通知', reason: '错别字检测', status: 'pending' },
                 { id: 2, type: 'format', original: '2024年3月32日', suggestion: '2024年3月31日', reason: '日期逻辑错误', status: 'pending' }
             ] as any };
        }
        return { code: 200, message: 'OK', data: `[Agent Mock Output] \n\n这是智能写作/排版服务的模拟输出结果。您的输入已被处理，但由于未连接后端 LLM 服务，仅显示此占位符。\n\n实际部署后，此处将流式输出 GPT/Gemini 生成的高质量文档内容。` as any };
    }

    return { code: 404, message: 'Not Found', data: null as any };
}

// --- EXPORTED SERVICES ---

export const AuthService = {
    login: (payload: { username: string; secret: string }) => mockRequest<any>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    register: (payload: any) => mockRequest<any>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    getCurrentUser: () => mockRequest<any>('/auth/me', { method: 'GET' }),
    logout: () => mockRequest<boolean>('/auth/logout', { method: 'POST' }),
};

export const AdminService = {
    getRegistrationRequests: () => mockRequest<any[]>('/admin/registrations', { method: 'GET' }),
    approveRegistration: (id: string) => mockRequest<boolean>(`/admin/registrations/${id}/approve`, { method: 'POST' }),
    rejectRegistration: (id: string) => mockRequest<boolean>(`/admin/registrations/${id}/reject`, { method: 'POST' }),
    
    getUsers: () => mockRequest<any[]>('/admin/users', { method: 'GET' }),
    createUser: (data: any) => mockRequest<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id: string, data: any) => mockRequest<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id: string) => mockRequest<boolean>(`/admin/users/${id}`, { method: 'DELETE' }),

    getKBs: () => mockRequest<any[]>('/admin/kbs', { method: 'GET' }),
    createKB: (data: any) => mockRequest<any>('/admin/kbs', { method: 'POST', body: JSON.stringify(data) }),
    updateKB: (id: string, data: any) => mockRequest<any>(`/admin/kbs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteKB: (id: string) => mockRequest<boolean>(`/admin/kbs/${id}`, { method: 'DELETE' }),

    getPolicies: () => mockRequest<any[]>('/admin/policies', { method: 'GET' }),
    createPolicy: (data: any) => mockRequest<any>('/admin/policies', { method: 'POST', body: JSON.stringify(data) }),
    updatePolicy: (id: string, data: any) => mockRequest<any>(`/admin/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePolicy: (id: string) => mockRequest<boolean>(`/admin/policies/${id}`, { method: 'DELETE' }),

    getPendingFAQs: () => mockRequest<any[]>('/admin/faqs/pending', { method: 'GET' }),
    approveFAQ: (id: string) => mockRequest<boolean>(`/admin/faqs/${id}/approve`, { method: 'POST' }),
    rejectFAQ: (id: string) => mockRequest<boolean>(`/admin/faqs/${id}/reject`, { method: 'POST' }),
    createFAQ: (data: any) => mockRequest<any>('/admin/faqs', { method: 'POST', body: JSON.stringify(data) }),
    updateFAQ: (id: string, data: any) => mockRequest<any>(`/admin/faqs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFAQ: (id: string) => mockRequest<boolean>(`/admin/faqs/${id}`, { method: 'DELETE' }),

    getSearchConfig: () => mockRequest<any>('/admin/search-config', { method: 'GET' }),
    updateSearchConfig: (data: any) => mockRequest<any>('/admin/search-config', { method: 'PUT', body: JSON.stringify(data) }),

    getAuditLogs: (params: any) => mockRequest<any[]>('/admin/audit-logs', { method: 'GET' }),
    exportAuditLogs: (payload: any) => mockRequest<any>('/admin/audit-logs/export', { method: 'POST', body: JSON.stringify(payload) }),
};

export const ChatService = {
    getSessions: () => mockRequest<any[]>('/chat/sessions', { method: 'GET' }),
    createSession: (payload: any) => mockRequest<any>('/chat/sessions', { method: 'POST', body: JSON.stringify(payload) }),
    deleteSession: (id: string) => mockRequest<boolean>(`/chat/sessions/${id}`, { method: 'DELETE' }),
    renameSession: (id: string, payload: any) => mockRequest<any>(`/chat/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    
    getHistory: (id: string) => mockRequest<any[]>(`/chat/sessions/${id}/messages`, { method: 'GET' }),
    sendMessage: (id: string, query: string, config: any, quote?: string) => mockRequest<any>(`/chat/sessions/${id}/messages`, { 
        method: 'POST', 
        body: JSON.stringify({ query, config, quote }) 
    }),
    exportEvidence: (id: string) => Promise.resolve("data:application/zip;base64,MOCK_ZIP_DATA"), // Mock
    submitFeedbackToFAQ: (payload: any) => mockRequest<any>('/chat/feedback/faq', { method: 'POST', body: JSON.stringify(payload) }),
};

export const GraphService = {
    queryGraph: () => mockRequest<any>('/graph/query', { method: 'GET' }),
    getEntityDetail: (id: string) => mockRequest<any>(`/graph/entities/${id}`, { method: 'GET' }),
    findPath: (payload: any) => mockRequest<any>('/graph/path', { method: 'POST', body: JSON.stringify(payload) }),
    getEvolution: (params: { entity_id: string; date: string }) => mockRequest<any>(`/graph/evolution?entity_id=${params.entity_id}&date=${params.date}`, { method: 'GET' }),
};

export const DocumentService = {
    getAuthorizedKBs: () => mockRequest<any[]>('/documents/kbs', { method: 'GET' }),
    getDocuments: (kbId: string) => mockRequest<any[]>(`/documents/kbs/${kbId}/files`, { method: 'GET' }),
    getDocumentDetail: (id: string) => mockRequest<any>(`/documents/${id}`, { method: 'GET' }),
    downloadDesensitized: (id: string) => mockRequest<any>(`/documents/${id}/desensitize`, { method: 'GET' }),
    applyPrint: (payload: any) => mockRequest<any>(`/documents/${payload.doc_id}/print`, { method: 'POST', body: JSON.stringify(payload) }),
    uploadDocument: (file: File, params: any) => Promise.resolve({ code: 200, message: 'Uploaded', data: true }),
};

export const ApiService = {
    parseFile: (file: File) => mockRequest<any>('/files/parse', { method: 'POST' }),
};

export const AgentService = {
    write: (payload: any) => mockRequest<string>('/agent/write', { method: 'POST', body: JSON.stringify(payload) }),
    optimize: (payload: any) => mockRequest<string>('/agent/optimize', { method: 'POST', body: JSON.stringify(payload) }),
    format: (payload: any) => mockRequest<string>('/agent/format', { method: 'POST', body: JSON.stringify(payload) }),
    proofread: (payload: any) => mockRequest<any[]>('/agent/proofread', { method: 'POST', body: JSON.stringify(payload) }),
};