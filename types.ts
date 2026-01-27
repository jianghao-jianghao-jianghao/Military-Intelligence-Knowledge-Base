
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
  MANAGE_SECURITY = '安全策略下发'
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
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'WARNING';
}

export interface SensitiveWordPolicy {
  id: string;
  word: string;
  replacement: string;
  severity: 'low' | 'high';
  is_active: boolean;
}

export interface RetrievalConfig {
  selected_kb_ids: string[];
  strategy: 'hybrid' | 'vector' | 'keyword';
  enhanced: {
    queryRewrite: boolean;
    hyde: boolean;
    stepback: boolean;
  };
}

export interface ReasoningStep {
  title: string;
  content: string;
  type: 'search' | 'reason' | 'verify' | 'security_check';
}

export interface Provenance {
  sentence_id: string;
  source_name: string;
  text: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio';
  source_uri?: string;
  start?: number;
  end?: number;
  score: number;
  security_level: ClearanceLevel;
}

export interface QAResponse {
  id?: string;
  answer: string;
  thought_process: ReasoningStep[];
  provenance: Provenance[];
  confidence: number;
  security_badge: ClearanceLevel;
  is_desensitized: boolean;
  timestamp?: string;
}
