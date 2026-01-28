
import React from 'react';
import { ClearanceLevel, KnowledgeBase, WeaponDocument, AuditLog, SensitiveWordPolicy, Permission, Department, Role, User, UserRole, FAQPair, AuditStatus } from './types.ts';

export const COLORS = {
  bg: '#0d1117',
  surface: '#161b22',
  muted: '#8b949e',
  text: '#c9d1d9',
  accent: '#58a6ff',
  danger: '#da3633',
  success: '#238636',
  border: '#30363d',
  focus: 'rgba(31,111,235,0.25)'
};

export const MOCK_FAQS: FAQPair[] = [
  {
    id: 'faq-1',
    question: '15式轻型坦克的高原适应性如何？',
    answer: '15式轻型坦克采用专门设计的高原型动力系统，能够在海拔4500米以上地区保持额定功率的85%以上。',
    category: '装备参数',
    status: AuditStatus.APPROVED,
    clearance: ClearanceLevel.INTERNAL,
    lastUpdated: '2024-01-10'
  },
  {
    id: 'faq-2',
    question: '如何申请机密级文档的物理调阅？',
    answer: '需在治理中心提交“调阅申请单”，由所属部门主管和机密审计员双重审批后，至机要室凭证调阅。',
    category: '流程指南',
    status: AuditStatus.APPROVED,
    clearance: ClearanceLevel.INTERNAL,
    lastUpdated: '2023-11-20'
  }
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'd1', name: '动力系统研制中心', code: 'POWER-RD' },
  { id: 'd2', name: '装甲结构设计部', code: 'ARMOR-DS' },
  { id: 'd3', name: '火控系统实验室', code: 'FIRE-LAB' }
];

export const MOCK_ROLES: Role[] = [
  { id: 'r1', name: '总研制师', departmentId: 'd1', permissions: Object.values(Permission) },
  { id: 'r2', name: '机密审计员', departmentId: 'd1', permissions: [Permission.VIEW_AUDIT, Permission.VIEW_DOCS, Permission.MANAGE_SECURITY] },
  { id: 'r3', name: '普通研究员', departmentId: 'd2', permissions: [Permission.VIEW_DOCS, Permission.EDIT_DOCS] }
];

export const MOCK_USERS: User[] = [
  { id: '1', name: '陆研工', username: 'luyangong', role: UserRole.SUPER_ADMIN, roleId: 'r1', departmentId: 'd1', clearance: ClearanceLevel.SECRET, status: 'ACTIVE' },
  { id: '2', name: '王分析', username: 'wangfenxi', role: UserRole.KB_MANAGER, roleId: 'r2', departmentId: 'd1', clearance: ClearanceLevel.CONFIDENTIAL, status: 'ACTIVE' },
  { id: '3', name: '李用户', username: 'liyonghu', role: UserRole.USER, roleId: 'r3', departmentId: 'd2', clearance: ClearanceLevel.INTERNAL, status: 'ACTIVE' },
];

export const MOCK_KBS: KnowledgeBase[] = [
  {
    id: 'kb-1',
    name: '装甲动力核心指标库',
    description: '收录各型号坦克的发动机参数与实验数据。',
    clearance: ClearanceLevel.SECRET,
    authorized_departments: ['d1'],
    authorized_roles: ['r1', 'r2'],
    authorized_users: ['1', '2'],
    owner_id: '1',
    created_at: '2023-10-01'
  },
  {
    id: 'kb-2',
    name: '通用武器装备手册',
    description: '兵工集团公开及内部通用的装备操作指南。',
    clearance: ClearanceLevel.INTERNAL,
    authorized_departments: ['d1', 'd2'],
    authorized_roles: ['r1', 'r2', 'r3'],
    authorized_users: ['1', '2', '3'],
    owner_id: '1',
    created_at: '2023-05-15'
  }
];

export const MOCK_DOCS: WeaponDocument[] = [
  { 
    id: 'doc-1', 
    kb_id: 'kb-1', 
    title: '15式轻坦高原发动机热力分析', 
    type: 'PDF', 
    clearance: ClearanceLevel.SECRET, 
    last_updated: '2024-03-20',
    content_preview: '本文针对15式轻型坦克在海拔4500米以上的高原环境下的发动机热负荷进行了详细分析。实验数据表明，由于含氧量降低，其涡轮增压系统需进行特定参数补偿以维持额定功率...'
  },
  { id: 'doc-2', kb_id: 'kb-1', title: '动力总成压力测试原始记录', type: 'XLSX', clearance: ClearanceLevel.SECRET, last_updated: '2024-03-15' },
  { id: 'doc-3', kb_id: 'kb-2', title: '轻量化步兵武器维护手册', type: 'DOCX', clearance: ClearanceLevel.INTERNAL, last_updated: '2023-12-01' }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', timestamp: '2024-03-25 10:12:03', userId: '1', userName: '陆研工', action: 'ACCESS_KB', resource: '装甲动力核心指标库', status: 'SUCCESS' },
  { id: 'log-2', timestamp: '2024-03-25 11:45:22', userId: '3', userName: '李用户', action: 'ILLEGAL_DOC_ACCESS', resource: '15式轻坦高原发动机热力分析', status: 'DENIED' },
  { id: 'log-3', timestamp: '2024-03-25 12:00:00', userId: '2', userName: '王分析', action: 'UPDATE_SECURITY_RULE', resource: '敏感词: DF-17', status: 'WARNING' },
  { id: 'log-4', timestamp: '2024-03-26 09:30:15', userId: '1', userName: '陆研工', action: 'CREATE_KB', resource: '新型导弹火控数据库', status: 'SUCCESS' },
  { id: 'log-5', timestamp: '2024-03-26 14:22:10', userId: '2', userName: '王分析', action: 'DELETE_POLICY', resource: '敏感词: 潜艇', status: 'SUCCESS' }
];

export const MOCK_POLICIES: SensitiveWordPolicy[] = [
  { id: 'p1', word: 'DF-17', replacement: '某型导弹', severity: 'high', is_active: true },
  { id: 'p2', word: '研制基地', replacement: 'XX枢纽', severity: 'high', is_active: true },
  { id: 'p3', word: '核动力', replacement: '[数据屏蔽]', severity: 'high', is_active: false },
];

export const Icons = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 1 1 1.06-1.06l3.91 3.91a.75.75 0 1 1-1.06 1.06l-3.91-3.91zM12 7a5 5 0 1 0-10 0 5 5 0 0 0 10 0z"></path></svg>
  ),
  Database: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.378 1.954C2.16 1.408 3.511 1 5.5 1h5c1.989 0 3.34.408 4.122.954.78.546 1.128 1.258 1.128 2.046 0 .788-.348 1.5-1.128 2.046-.782.546-2.133.954-4.122.954h-5c-1.989 0-3.34-.408-4.122-.954C.62 5.5.25 4.788.25 4c0-.788.37-1.5 1.128-2.046zM5.5 2.5c-1.63 0-2.61.32-3.003.595-.333.232-.497.464-.497.905 0 .441.164.673.497.905.393.275 1.373.595 3.003.595h5c1.63 0 2.61-.32 3.003-.595.333-.232.497-.464.497-.905 0-.441-.164-.673-.497-.905-.393-.275-1.373-.595-3.003-.595h-5zM.25 7c0-.256.04-.501.116-.732.127.142.274.275.441.392.782.546 2.133.954 4.122.954h5c1.989 0 3.34-.408 4.122-.954.167-.117.314-.25.441-.392.076.231.116.476.116.732v.75c0 .788-.348 1.5-1.128 2.046-.782.546-2.133.954-4.122.954h-5c-1.989 0-3.34-.408-4.122-.954C.62 10.25.25 9.538.25 8.75V7zm0 4.75v.75c0 .788.348 1.5 1.128 2.046.782.546 2.133.954 4.122.954h5c1.989 0 3.34-.408 4.122-.954.78-.546 1.128-1.258 1.128-2.046v-.75c0 .256-.04.501-.116.732-.127-.142-.274-.275-.441-.392-.782-.546-2.133-.954-4.122-.954h-5c-1.989 0-3.34.408-4.122.954-.167.117-.314.25-.441.392-.076-.231-.116-.476-.116-.732z"></path></svg>
  ),
  Network: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>
  ),
  File: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.75 16h-10A1.75 1.75 0 0 1 2 14.25V1.75zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-3.414-3.414a.25.25 0 0 0-.177-.073H3.75z"></path></svg>
  ),
  Activity: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a.75.75 0 0 1 .75-.75h2.25l1.5-4.5 2.5 9 2.5-4.5h2.25a.75.75 0 0 1 0 1.5h-1.5L8.75 12.75 6.25 3.75 4.75 8.25H.75A.75.75 0 0 1 0 8z"></path></svg>
  ),
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 5a4 4 0 0 1 8 0v2h.75a1.25 1.25 0 0 1 1.25 1.25v5.5A1.25 1.25 0 0 1 12.75 15h-9.5A1.25 1.25 0 0 1 2 13.75v-5.5A1.25 1.25 0 0 1 3.25 7H4V5zm1.5 2h5V5a2.5 2.5 0 0 0-5 0v2zM3.5 8.5v5.25a.25.25 0 0 0 .25.25h8.5a.25.25 0 0 0 .25-.25V8.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25z"></path></svg>
  ),
  Menu: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75zM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5z"></path></svg>
  ),
  Share: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M15 14c1.33 0 2-1 2-2 0-2.67-4-4-4-4s-4 1.33-4 4c0 1 .67 2 2 2h4zm-11-2c0-2.67 4-4 4-4 .63 0 1.22.05 1.76.14a1.28 1.28 0 0 0-.26.86c0 .44.1.84.28 1.2-.54.12-1.14.24-1.78.34-.67.11-1.33.22-2 .32v1.14h4v1.5H4v-1.5zm4-6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path></svg>
  ),
  Upload: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14ZM11.78 6.28a.75.75 0 0 1-1.06 0L8.75 4.31v6.44a.75.75 0 0 1-1.5 0V4.31L5.28 6.28a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z"></path></svg>
  )
};
