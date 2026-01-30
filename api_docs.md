
# 兵工研制大脑 - 后端 API 接口文档 (v1.0)

本文档定义了前端 (`services/api.ts`) 与后端 (`FastAPI`/`Spring Boot`) 的交互契约。

- **Base URL**: `http://localhost:8000/api/v1`
- **Protocol**: HTTP/1.1
- **Content-Type**: `application/json` (文件上传除外)
- **Authentication**: Bearer Token (JWT)

---

## 1. 通用响应结构 (Standard Response)

所有 API 接口（除文件流下载外）均返回以下标准 JSON 结构：

```json
{
  "code": 200,          // 业务状态码 (200: 成功, 4xx: 客户端错误, 5xx: 服务端错误)
  "message": "OK",      // 状态描述信息
  "data": { ... },      // 实际业务数据
  "timestamp": "2024-03-26T10:00:00Z", // 可选
  "trace_id": "abc-123" // 可选，分布式追踪ID
}
```

> **注意**: 下文中的 "Response" 示例仅展示 `data` 字段的内容。

---

## 2. 认证模块 (Authentication)

### 2.1 用户登录
*   **URL**: `/auth/login`
*   **Method**: `POST`
*   **Description**: 验证用户名和密码（或密钥），返回 JWT Token。

**Request Body:**
```json
{
  "username": "luyangong",
  "secret": "password123"
}
```

**Response Data:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "user": {
    "id": "1",
    "name": "陆研工",
    "username": "luyangong",
    "role": "SUPER_ADMIN", 
    "departmentId": "d1",
    "clearance": "机密",
    "status": "ACTIVE"
  }
}
```

### 2.2 注册申请
*   **URL**: `/auth/register`
*   **Method**: `POST`
*   **Description**: 提交新用户注册申请，进入管理员审计队列。

**Request Body:**
```json
{
  "fullName": "张三",
  "username": "zhangsan",
  "password": "initialPassword",
  "departmentId": "d1",
  "intendedClearance": "内部公开", // Enum: 非涉密, 内部公开, 秘密, 机密
  "justification": "参与某型坦克动力系统研发项目"
}
```

**Response Data:**
```json
{
  "requestId": "req-12345",
  "status": "审核中"
}
```

### 2.3 获取当前用户信息
*   **URL**: `/auth/me`
*   **Method**: `GET`
*   **Headers**: `Authorization: Bearer <token>`
*   **Description**: 根据 Token 获取当前会话用户详情。

**Response Data:**
```json
{
  "user": { /* User Object */ }
}
```

### 2.4 登出
*   **URL**: `/auth/logout`
*   **Method**: `POST`
*   **Headers**: `Authorization: Bearer <token>`

**Response Data:** `true`

---

## 3. 管理后台 - 人员与审批 (Admin: Users & Governance)

### 3.1 获取注册审批列表
*   **URL**: `/admin/registrations`
*   **Method**: `GET`
*   **Permissions**: `SUPER_ADMIN` or `KB_MANAGER`

**Response Data:** `Array<RegistrationRequest>`
```json
[
  {
    "id": "req-1",
    "fullName": "陈研员",
    "username": "chenyanyuan",
    "departmentId": "d3",
    "intendedClearance": "机密",
    "justification": "需要调阅某型火控雷达数据",
    "status": "审核中",
    "requestDate": "2024-03-24 14:20"
  }
]
```

### 3.2 批准注册
*   **URL**: `/admin/registrations/{id}/approve`
*   **Method**: `POST`
*   **Description**: 批准申请并在 `users` 表中正式创建用户。

**Response Data:** `true`

### 3.3 驳回注册
*   **URL**: `/admin/registrations/{id}/reject`
*   **Method**: `POST`

**Response Data:** `true`

### 3.4 用户管理 (CRUD)
*   **GET** `/admin/users`: 获取所有用户列表。
*   **POST** `/admin/users`: 管理员直接创建用户。
    *   Body: `{ "name": "...", "username": "...", "departmentId": "...", "roleId": "...", "clearance": "...", "status": "ACTIVE" }`
*   **PUT** `/admin/users/{id}`: 更新用户信息。
    *   Body: `{ "roleId": "...", "clearance": "机密", "status": "LOCKED" }`
*   **DELETE** `/admin/users/{id}`: 删除/注销用户。

---

## 4. 管理后台 - 知识资产 (Admin: KB & DLP)

### 4.1 知识库管理
*   **GET** `/admin/kbs`: 获取所有知识库。
*   **POST** `/admin/kbs`: 创建新库及 ACL 策略。

**Request Body (Create KB):**
```json
{
  "name": "装甲动力核心指标库",
  "description": "收录各型号坦克的发动机参数...",
  "clearance": "机密",
  "authorized_departments": ["d1", "d2"],
  "authorized_roles": ["r1"],
  "authorized_users": []
}
```

*   **PUT** `/admin/kbs/{id}`: 更新知识库配置。
*   **DELETE** `/admin/kbs/{id}`: 删除知识库（软删除或级联删除）。

### 4.2 敏感词策略 (DLP)
*   **GET** `/admin/policies`: 获取拦截规则。
*   **POST** `/admin/policies`: 创建规则。

**Request Body:**
```json
{
  "word": "DF-41",
  "replacement": "某型战略导弹",
  "severity": "high", // low, high
  "is_active": true
}
```
*   **PUT** `/admin/policies/{id}`: 更新规则。
*   **DELETE** `/admin/policies/{id}`: 删除规则。

### 4.3 检索策略配置
*   **GET** `/admin/search-config`: 获取全局 RAG 参数。
*   **PUT** `/admin/search-config`: 更新全局参数。

**Request/Response Body:**
```json
{
  "config": {
    "strategy": "hybrid", // hybrid, vector, keyword
    "tiers": {
      "faq": true,
      "graph": true,
      "docs": true,
      "llm": true
    },
    "enhanced": {
      "queryRewrite": true,
      "hyde": false,
      "stepback": true
    },
    "parameters": {
      "topK": 5,
      "threshold": 0.75
    }
  }
}
```

### 4.4 审计日志
*   **GET** `/admin/audit-logs`: 获取日志列表。
    *   Query Params: `page=1`, `limit=20`
*   **POST** `/admin/audit-logs/export`: 导出日志。
    *   Body: `{ "format": "pdf", "query": { "limit": 1000 } }`
    *   Response: `{ "url": "data:application/pdf;base64,..." }` (Base64 file string or S3 URL)

---

## 5. 管理后台 - 问答治理 (Admin: FAQ)

### 5.1 获取待审核 FAQ
*   **URL**: `/admin/faqs/pending`
*   **Method**: `GET`
*   **Description**: 获取由 Chat 模块回流的、状态为 `审核中` 的问答对。

### 5.2 批准入库
*   **URL**: `/admin/faqs/{id}/approve`
*   **Method**: `POST`
*   **Description**: 将 FAQ 状态更为 `APPROVED` 并更新向量索引。

### 5.3 驳回建议
*   **URL**: `/admin/faqs/{id}/reject`
*   **Method**: `POST`

### 5.4 手动管理 FAQ
*   **POST** `/admin/faqs`: 手动录入标准问答。
    *   Body: `{ "question": "...", "answer": "...", "category": "...", "clearance": "..." }`
*   **PUT** `/admin/faqs/{id}`: 修改内容。
*   **DELETE** `/admin/faqs/{id}`: 删除。

---

## 6. 智能问答 (Chat & RAG Engine)

### 6.1 会话管理
*   **GET** `/chat/sessions`: 获取当前用户的历史会话。
*   **POST** `/chat/sessions`: 创建新会话。
    *   Body: `{ "title": "Optional", "bound_kb_ids": ["kb-1"] }`
*   **DELETE** `/chat/sessions/{id}`: 删除会话。
*   **PATCH** `/chat/sessions/{id}`: 重命名会话。
    *   Body: `{ "title": "New Title" }`

### 6.2 获取消息历史
*   **URL**: `/chat/sessions/{id}/messages`
*   **Method**: `GET`

### 6.3 发送消息 (核心 RAG 接口)
*   **URL**: `/chat/sessions/{id}/messages`
*   **Method**: `POST`
*   **Description**: 触发 RAG 检索、推理与生成。

**Request Body:**
```json
{
  "query": "15式坦克的发动机在高原表现如何？",
  "quote": "可选的引用文本上下文",
  "config": {
    "selected_kb_ids": ["kb-1"],
    "strategy": "hybrid",
    "tiers": { "faq": true, "graph": true, "docs": true, "llm": true },
    "enhanced": { "queryRewrite": true, "stepback": true }
  }
}
```

**Response Data (QAResponse):**
```json
{
  "id": "msg-123",
  "answer": "15式轻型坦克专为高原设计... (Markdown)",
  "confidence": 0.98,
  "security_badge": "机密",
  "is_desensitized": false,
  "thought_process": [
    { "title": "语义解析", "content": "提取实体: 15式坦克", "type": "reason" },
    { "title": "图谱路由", "content": "检索节点...", "type": "graph_traversal" }
  ],
  "provenance": [
    {
      "sentence_id": "p1",
      "source_type": "DOCS",
      "source_name": "15式热力分析.pdf",
      "doc_id": "doc-1",
      "text": "原文片段...",
      "score": 0.95,
      "security_level": "机密",
      "start": 100,
      "end": 150
    }
  ]
}
```

### 6.4 提交 FAQ 反馈
*   **URL**: `/chat/feedback/faq`
*   **Method**: `POST`
*   **Body**: `{ "conversation_id": "...", "question": "...", "answer": "..." }`

---

## 7. 知识图谱 (Knowledge Graph)

### 7.1 图谱查询
*   **URL**: `/graph/query`
*   **Method**: `GET`
*   **Description**: 返回初始图谱数据（节点与边）。

**Response Data (GraphData):**
```json
{
  "nodes": [
    { "id": "n1", "label": "15式坦克", "type": "WEAPON", "x": 0, "y": 0, "color": "..." }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2", "label": "研制单位" }
  ]
}
```

### 7.2 实体详情
*   **URL**: `/graph/entities/{id}`
*   **Method**: `GET`

**Response Data (EntityDetail):**
```json
{
  "id": "n1",
  "name": "15式轻型坦克",
  "type": "WEAPON",
  "attributes": [{ "key": "战斗全重", "value": "33吨" }],
  "related_docs": [ /* Document Objects */ ]
}
```

### 7.3 路径发现
*   **URL**: `/graph/path`
*   **Method**: `POST`
*   **Body**: `{ "start_entity_id": "n1", "end_entity_id": "n2" }`
*   **Response**: `{ "paths": [ GraphData, GraphData... ] }`

### 7.4 时序演进
*   **URL**: `/graph/evolution`
*   **Method**: `GET`
*   **Query Params**: `entity_id=n1`, `date=2024`

**Response Data:**
```json
{
  "date": "2024",
  "snapshot": { /* GraphData at that point in time */ },
  "events": [ { "date": "2016", "title": "定型", "description": "..." } ]
}
```

---

## 8. 文档中心 (Documents & Files)

### 8.1 文件解析 (上传)
*   **URL**: `/files/parse`
*   **Method**: `POST`
*   **Content-Type**: `multipart/form-data`
*   **Description**: 上传文件，后端提取文本内容及元数据（不入库，仅预览/解析）。

**Form Data:**
*   `file`: Binary File

**Response Data:**
```json
{
  "fileName": "test.docx",
  "fileType": "DOCX",
  "content": "提取的纯文本内容...",
  "metadata": { "pageCount": 5, "author": "..." }
}
```

### 8.2 确认入库 (Ingest)
*   **URL**: `/documents/upload` (Mapped in frontend via `DocumentService.uploadDocument` logic)
*   **Method**: `POST`
*   **Content-Type**: `multipart/form-data`
*   **Form Data**: `file`, `kbId`, `clearance`

### 8.3 获取授权知识库列表
*   **URL**: `/documents/kbs`
*   **Method**: `GET`

### 8.4 获取库内文档
*   **URL**: `/documents/kbs/{id}/files`
*   **Method**: `GET`

### 8.5 文档详情
*   **URL**: `/documents/{id}`
*   **Method**: `GET`

### 8.6 下载脱敏副本
*   **URL**: `/documents/{id}/desensitize`
*   **Method**: `GET`
*   **Response**: `{ "url": "..." }`

### 8.7 打印申请
*   **URL**: `/documents/{id}/print`
*   **Method**: `POST`
*   **Body**: `{ "doc_id": "...", "reason": "...", "copies": 1 }`
*   **Response**: `{ "applicationId": "print-123" }`

---

## 9. 智能文档工坊 (Agentic Tools)

### 9.1 智能写作
*   **POST** `/agent/write`
*   **Body**: `{ "topic": "...", "outline": "..." }`
*   **Response**: String (Markdown Content)

### 9.2 文案优化
*   **POST** `/agent/optimize`
*   **Body**: `{ "content": "...", "instruction": "..." }`
*   **Response**: String

### 9.3 智能排版
*   **POST** `/agent/format`
*   **Body**: `{ "content": "...", "style": "Official Red-Head Doc" }`
*   **Response**: String (HTML with CSS for print layout)

### 9.4 智能校对
*   **POST** `/agent/proofread`
*   **Body**: `{ "content": "...", "reference": "Optional Standard Text" }`

**Response Data:** `Array<ProofreadSuggestion>`
```json
[
  {
    "id": 1,
    "type": "typo",
    "original": "痛知",
    "suggestion": "通知",
    "reason": "上下文语义检测",
    "status": "pending"
  }
]
```

---

## 附录：枚举定义 (Enums)

**ClearanceLevel (密级)**
*   `UNCLASSIFIED` ("非涉密")
*   `INTERNAL` ("内部公开")
*   `CONFIDENTIAL` ("秘密")
*   `SECRET` ("机密")

**UserRole (角色)**
*   `USER` ("普通研究员")
*   `KB_MANAGER` ("机密审计员")
*   `SUPER_ADMIN` ("总研制师")

**AuditStatus (审核状态)**
*   `PENDING` ("审核中")
*   `APPROVED` ("已批准")
*   `REJECTED` ("已驳回")
