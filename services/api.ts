
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
  FAQFeedbackRequest
} from "../types.ts";
import { MOCK_KBS, MOCK_DOCS, MOCK_AUDIT_LOGS } from '../constants.tsx';

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
    await new Promise(r => setTimeout(r, 600)); // Simulate network latency

    // --- AUTH MOCKS ---
    if (endpoint === '/auth/login') {
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

// Generic Request Wrapper with Fallback
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(options.body instanceof FormData),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError("Unauthorized", 401);
      }
      throw new ApiError(response.statusText, response.status);
    }

    const json = await response.json();
    return {
      code: json.code || 200,
      message: json.message || "Success",
      data: json.data !== undefined ? json.data : json,
      timestamp: json.timestamp || new Date().toISOString()
    };

  } catch (error) {
    // FALLBACK TO MOCK
    console.warn(`API Request Failed [${options.method || 'GET'} ${url}]. Falling back to mock data.`);
    return mockRequest<T>(endpoint, options);
  }
}

/**
 * Auth Service: Authentication and Session Management
 */
export const AuthService = {
  /**
   * Login user and return token.
   * POST /auth/login
   */
  async login(credentials: { username: string; secret: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Register a new user application.
   * POST /auth/register
   */
  async register(payload: RegisterUserRequest): Promise<ApiResponse<{ requestId: string; status: string }>> {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  /**
   * Get current authenticated user session.
   * GET /auth/me
   */
  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return request("/auth/me");
  },

  /**
   * Logout user and invalidate token.
   * POST /auth/logout
   */
  async logout(): Promise<ApiResponse<boolean>> {
    return request("/auth/logout", {
      method: "POST"
    });
  }
};

export const ApiService = {
  // Keeping these for legacy compat or non-auth specific methods
  async parseFile(file: File): Promise<ApiResponse<FileParseResult>> {
    const formData = new FormData();
    formData.append("file", file);
    return request("/files/parse", { method: "POST", body: formData });
  },

  async getDocumentById(id: string): Promise<ApiResponse<WeaponDocument | null>> {
    return request(`/documents/${id}`);
  },

  async uploadDocument(file: File, meta: { kbId: string, clearance: ClearanceLevel }): Promise<ApiResponse<boolean>> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kb_id", meta.kbId);
    formData.append("clearance", meta.clearance);
    return request("/documents/ingest", { method: "POST", body: formData });
  },

  async getAuditLogs(params: { page: number; limit: number }): Promise<ApiResponse<AuditLog[]>> {
    const query = new URLSearchParams({ page: params.page.toString(), limit: params.limit.toString() });
    return request(`/admin/audit-logs?${query.toString()}`);
  }
};

/**
 * Chat Service: Manages Security Intelligent Q&A Sessions and Interactions.
 */
export const ChatService = {
  /**
   * List all sessions.
   * GET /chat/sessions
   */
  async getSessions(): Promise<ApiResponse<Conversation[]>> {
    return request("/chat/sessions");
  },

  /**
   * Create new session.
   * POST /chat/sessions
   */
  async createSession(payload: CreateChatRequest): Promise<ApiResponse<Conversation>> {
    return request("/chat/sessions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  /**
   * Delete session.
   * DELETE /chat/sessions/{id}
   */
  async deleteSession(sessionId: string): Promise<ApiResponse<boolean>> {
    return request(`/chat/sessions/${sessionId}`, {
      method: "DELETE"
    });
  },

  /**
   * Rename session.
   * PATCH /chat/sessions/{id}
   */
  async renameSession(sessionId: string, payload: UpdateChatRequest): Promise<ApiResponse<Conversation>> {
    return request(`/chat/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  /**
   * Get message history.
   * GET /chat/sessions/{id}/messages
   */
  async getHistory(sessionId: string): Promise<ApiResponse<Message[]>> {
    return request(`/chat/sessions/${sessionId}/messages`);
  },

  /**
   * Send message (RAG).
   * POST /chat/sessions/{id}/messages
   */
  async sendMessage(
    sessionId: string, 
    query: string, 
    config: RetrievalConfig, 
    quoteContext?: string
  ): Promise<ApiResponse<QAResponse>> {
    const payload = {
      query: query,
      retrieval_config: config,
      quote_context: quoteContext || null,
      stream: false 
    };

    return request(`/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  /**
   * Export evidence chain.
   * GET /chat/sessions/{id}/evidence/export
   */
  async exportEvidence(sessionId: string): Promise<string> {
    return "data:text/plain;charset=utf-8,MockEvidencePackage"; 
  },

  /**
   * Feedback Q&A pair to FAQ knowledge base.
   * POST /chat/feedback/faq
   */
  async submitFeedbackToFAQ(payload: FAQFeedbackRequest): Promise<ApiResponse<{ review_id: string }>> {
    return request("/chat/feedback/faq", {
        method: "POST",
        body: JSON.stringify(payload)
    });
  }
};

/**
 * Agent Service: Document processing tasks.
 */
export const AgentService = {
  async write(payload: { topic: string; outline: string }): Promise<ApiResponse<string>> {
    return request("/agent/write", { method: "POST", body: JSON.stringify(payload) });
  },
  async optimize(payload: { content: string; instruction: string }): Promise<ApiResponse<string>> {
    return request("/agent/optimize", { method: "POST", body: JSON.stringify(payload) });
  },
  async proofread(payload: { content: string; reference?: string }): Promise<ApiResponse<ProofreadSuggestion[]>> {
    return request("/agent/proofread", { method: "POST", body: JSON.stringify(payload) });
  },
  async format(payload: { content: string; style: string }): Promise<ApiResponse<string>> {
    return request("/agent/format", { method: "POST", body: JSON.stringify(payload) });
  }
};
