
export enum UserRole {
  USER = 'USER',
  KB_MANAGER = 'KB_MANAGER',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum ClearanceLevel {
  UNCLASSIFIED = '非涉密',
  INTERNAL = '内部公开',
  CONFIDENTIAL = '秘密',
  SECRET = '机密'
}

export enum AuditStatus {
  PENDING = '审核中',
  APPROVED = '已批准',
  REJECTED = '已驳回'
}

export enum Permission {
  VIEW_DOCS = '文档调阅',
  EDIT_DOCS = '文档编辑',
  DELETE_DOCS = '文档删除',
  MANAGE_KBS = '库资产管理',
  MANAGE_ROLES = '角色授权管理',
  MANAGE_USERS = '人员准入管理',
  VIEW_AUDIT = '审计日志查看',
  MANAGE_SECURITY = '安全策略下发',
  DOC_PROCESS = '智能文档处理'
}

// --- API Response Wrappers (Robust Backend Contract) ---
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
  trace_id?: string; // For distributed tracing
}

export interface FileParseResult {
  fileName: string;
  fileType: string;
  content: string; 
  metadata?: {
    pageCount?: number;
    author?: string;
    detectedType?: string;
    processingTime?: number;
  };
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Role {
  id: string;
  name: string;
  departmentId: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  roleId: string;
  departmentId: string;
  clearance: ClearanceLevel;
  avatar?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  token?: string; // JWT Token
}

// DTO for Registration
export interface RegisterUserRequest {
  fullName: string;
  departmentId: string;
  intendedClearance: ClearanceLevel;
  justification: string;
  username: string;
  password?: string;
}

export interface RegistrationRequest {
  id: string;
  fullName: string;
  username: string;
  departmentId: string;
  intendedClearance: ClearanceLevel;
  justification: string;
  status: AuditStatus;
  requestDate: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  clearance: ClearanceLevel;
  authorized_departments: string[];
  authorized_roles: string[]; // Role IDs
  authorized_users: string[]; // User IDs
  owner_id: string;
  created_at: string;
}

export interface WeaponDocument {
  id: string;
  kb_id: string;
  title: string;
  type: string;
  clearance: ClearanceLevel;
  last_updated: string;
  content_preview?: string;
  s3_key?: string; // Backend storage reference
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'WARNING';
  ip_address?: string;
}

export interface SensitiveWordPolicy {
  id: string;
  word: string;
  replacement: string;
  severity: 'low' | 'high';
  is_active: boolean;
}

export interface FAQPair {
  id: string;
  question: string;
  answer: string;
  category: string;
  status: AuditStatus;
  clearance: ClearanceLevel;
  lastUpdated: string;
  suggestedBy?: string;
}

export interface RetrievalConfig {
  selected_kb_ids: string[];
  strategy: 'hybrid' | 'vector' | 'keyword';
  tiers: {
    faq: boolean;
    graph: boolean; // Apache AGE
    docs: boolean;  // pgvector
    llm: boolean;
  };
  enhanced: {
    queryRewrite: boolean;
    hyde: boolean;
    stepback: boolean;
  };
}

export interface ReasoningStep {
  title: string;
  content: string;
  type: 'search' | 'reason' | 'verify' | 'security_check' | 'rewrite' | 'hyde' | 'graph_traversal';
  duration_ms?: number;
}

// Enhanced Provenance for Backend RAG
export interface Provenance {
  sentence_id: string;
  source_type: 'FAQ' | 'KG' | 'DOCS' | 'LLM'; // Discriminator
  source_name: string;
  doc_id?: string;
  
  // Content
  text: string;
  
  // Metadata for different sources
  faq_meta?: { id: string; version?: string; question?: string };
  kg_meta?: { head: string; relation: string; tail: string; path_depth?: number };
  doc_meta?: { page_number?: number; chunk_index?: number };

  media_url?: string;
  media_type?: 'image' | 'video' | 'audio';
  
  score: number; // Similarity score (Cosine / BM25)
  security_level: ClearanceLevel;

  start?: number;
  end?: number;
}

export interface QAResponse {
  id?: string; // Answer ID
  conversation_id?: string;
  answer: string;
  media?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    caption: string;
  }[];
  thought_process: ReasoningStep[];
  provenance: Provenance[];
  confidence: number;
  security_badge: ClearanceLevel;
  is_desensitized: boolean;
  timestamp?: string;
  tier_hit?: 'FAQ' | 'GRAPH' | 'DOCS' | 'LLM';
  related_questions?: string[];
}

// --- Agent / Doc Processing Types ---
export interface ProofreadSuggestion {
  id: number;
  type: string;
  original: string;
  suggestion: string;
  reason: string;
  status?: 'accepted' | 'rejected' | 'pending';
}

export interface Message {
  id: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string; 
  quote?: string;
  timestamp: string;
  qaResponse?: QAResponse; 
}

export interface Conversation {
  id: string;
  title: string;
  user_id?: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
  bound_kb_ids: string[];
}

// DTOs for Chat Service
export interface CreateChatRequest {
  title?: string;
  bound_kb_ids: string[];
}

export interface UpdateChatRequest {
  title: string;
}

export interface FAQFeedbackRequest {
  conversation_id: string;
  question: string;
  answer: string;
}
