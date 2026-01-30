
# 兵工研制大脑 - 全域数据库架构设计文档 (v2.0)

## 1. 架构总览 (Architecture Overview)

本系统采用 **PostgreSQL 16+** 作为核心数据底座，利用其强大的扩展能力实现"多模态存储"：

*   **关系型核心 (Relational Core)**: 存储用户、权限、元数据、审计日志、工作流状态。
*   **向量引擎 (Vector Engine)**: 使用 `pgvector` 扩展，存储文档切片向量与 FAQ 语义向量，支持高维检索 (RAG)。
*   **图数据库 (Graph Engine)**: 使用 `Apache AGE` 扩展，支持 OpenCypher 图查询，处理装备谱系与产业链关系。
*   **缓存层 (Caching)**: Redis Cluster，用于会话状态 (Session)、热点配置及高频查询缓存。
*   **对象存储 (Blob Storage)**: MinIO/Ceph (S3 兼容)，存储非结构化文件实体 (PDF/Images)，数据库仅存 Metadata 与 S3 Key。

---

## 2. 关系型数据库设计 (Relational Schema)

**Schema**: `public` (System), `auth` (Identity), `kms` (Knowledge), `audit` (Logs)

### 2.1 身份与访问控制 (IAM) - Schema: `auth`

用于通过 RBAC (基于角色的访问控制) 和 ABAC (基于属性的访问控制) 实现严格的密级管理。

#### `auth.departments` (组织架构树)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default: gen_random_uuid() | 部门 ID |
| `name` | VARCHAR(100) | NOT NULL | 部门名称 |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | 部门代号 (e.g., `RD-POWER`) |
| `parent_id` | UUID | FK -> auth.departments.id | 父级部门 ID (NULL 为根节点) |
| `path` | LTREE | INDEX (GIST) | 层次路径 (Postgres ltree)，优化子树查询 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `auth.roles` (角色定义)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | 角色 ID |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | 角色标识 (e.g., `CONFIDENTIAL_AUDITOR`) |
| `permissions` | JSONB | NOT NULL, DEFAULT '[]' | 权限列表 (e.g., `["DOC_READ", "AUDIT_VIEW"]`) |

#### `auth.users` (用户实体)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | 用户 ID |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | 登录账号 |
| `password_hash` | VARCHAR(255) | NOT NULL | Argon2id 哈希 |
| `full_name` | VARCHAR(100) | | 真实姓名 |
| `department_id` | UUID | FK -> auth.departments.id | 所属部门 |
| `role_id` | UUID | FK -> auth.roles.id | 角色 |
| `clearance_level` | SMALLINT | CHECK (0-3) | 0:非密, 1:内部, 2:秘密, 3:机密 |
| `status` | VARCHAR(20) | DEFAULT 'ACTIVE' | ACTIVE, LOCKED, INACTIVE |
| `last_login_at` | TIMESTAMPTZ | | |

#### `auth.registration_requests` (注册审批暂存区)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `payload` | JSONB | NOT NULL | 包含拟注册的全部用户信息 |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' | PENDING, APPROVED, REJECTED |
| `auditor_id` | UUID | FK -> auth.users.id | 审批人 |
| `justification` | TEXT | | 申请理由 |

---

### 2.2 知识资产管理 (KMS) - Schema: `kms`

核心业务表，设计时需考虑海量文档的扩展性。

#### `kms.knowledge_bases` (知识库元数据)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `name` | VARCHAR(100) | NOT NULL | 库名称 |
| `base_clearance` | SMALLINT | NOT NULL | 库基准密级 |
| `owner_id` | UUID | FK -> auth.users.id | 责任人 |
| `is_archived` | BOOLEAN | DEFAULT FALSE | 归档标记 |
| `settings` | JSONB | | 高级配置 (e.g., 索引策略, 解析器选择) |

#### `kms.kb_acl` (知识库访问控制表)
*设计说明：采用多态关联或独立宽表实现 ACL，此处采用独立关联表以优化 JOIN 性能。*

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `kb_id` | UUID | FK, PK Component | |
| `subject_type` | VARCHAR(10) | CHECK ('DEPT', 'ROLE', 'USER') | 授权主体类型 |
| `subject_id` | UUID | PK Component | 部门/角色/用户 ID |
| `permission` | VARCHAR(20) | DEFAULT 'READ' | READ, WRITE, MANAGER |

#### `kms.documents` (文档索引表)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `kb_id` | UUID | FK -> kms.knowledge_bases.id | |
| `title` | VARCHAR(255) | NOT NULL | |
| `file_hash` | CHAR(64) | INDEX | SHA-256 哈希，用于去重 |
| `s3_key` | VARCHAR(512) | NOT NULL | 对象存储路径 |
| `file_size` | BIGINT | | 字节数 |
| `mime_type` | VARCHAR(50) | | application/pdf, etc. |
| `page_count` | INT | | |
| `clearance` | SMALLINT | NOT NULL | 文档级密级 (需 >= KB 密级) |
| `status` | VARCHAR(20) | | INDEXING, READY, FAILED |
| `meta` | JSONB | INDEX (GIN) | 扩展元数据 (作者, 发布年份, 型号标签) |

---

### 2.3 问答与会话 (Chat) - Schema: `chat`

#### `chat.conversations` (会话上下文)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `user_id` | UUID | FK -> auth.users.id | |
| `title` | VARCHAR(200) | | |
| `bound_kb_ids` | UUID[] | | 绑定的知识库范围 |
| `config_snapshot` | JSONB | | 发生会话时的检索参数快照 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `chat.messages` (消息流)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `conversation_id` | UUID | FK, INDEX | 分区键 (按时间或哈希分区) |
| `role` | VARCHAR(10) | CHECK ('user', 'assistant') | |
| `content` | TEXT | | 原始文本 |
| `thought_chain` | JSONB | | CoT 推理过程 (JSON Array) |
| `citations` | JSONB | | 引用源 (Provenance) |
| `tokens_usage` | INT | | 计费统计 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `chat.feedback` (RLHF 数据回流)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `message_id` | UUID | FK -> chat.messages.id | |
| `score` | SMALLINT | CHECK (-1, 0, 1) | 点赞/点踩 |
| `comment` | TEXT | | 用户修正意见 |
| `is_reviewed` | BOOLEAN | DEFAULT FALSE | 是否已人工审核 |

---

### 2.4 治理与合规 (Governance) - Schema: `gov`

#### `gov.audit_logs` (审计全记录)
**分区策略 (Partitioning)**: 按 `created_at` 进行范围分区 (Range Partitioning)，每月一张表 (`audit_logs_y2024m03`)，便于归档冷备。

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGSERIAL | PK | 自增 ID (海量写入性能更好) |
| `trace_id` | UUID | INDEX | 全链路追踪 ID |
| `user_id` | UUID | INDEX | |
| `action` | VARCHAR(50) | NOT NULL | LOGIN, VIEW_DOC, PRINT, EXPORT... |
| `resource_target` | VARCHAR(255) | | 目标资源标识 |
| `ip_address` | INET | | |
| `user_agent` | VARCHAR(255) | | |
| `status` | SMALLINT | | 1: Success, 0: Fail |
| `detail` | JSONB | | 失败原因或操作详情 |
| `created_at` | TIMESTAMPTZ | INDEX (BRIN) | 分区键 |

#### `gov.dlp_policies` (敏感词策略)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `pattern` | VARCHAR(100) | NOT NULL | 敏感词或正则 |
| `replacement` | VARCHAR(100) | | 替换掩码 |
| `action` | VARCHAR(20) | | MASK (脱敏), BLOCK (拦截), ALERT (告警) |
| `severity` | VARCHAR(20) | | HIGH, MEDIUM, LOW |

---

## 3. 向量存储设计 (Vector Schema - pgvector)

直接利用 PostgreSQL 存储向量，避免数据同步的一致性问题，并支持混合检索 (Filter + Vector)。

#### `kms.document_chunks` (文档切片)
**优化策略**: 针对 `embedding` 列建立 HNSW 索引。

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `doc_id` | UUID | FK -> kms.documents.id | 级联删除 |
| `kb_id` | UUID | INDEX | 冗余字段，用于快速过滤分区 |
| `content` | TEXT | NOT NULL | 切片文本 |
| `embedding` | VECTOR(1536) | | OpenAI/Bert 向量 (支持 768, 1024, 1536) |
| `page_idx` | INT | | 所在页码 |
| `chunk_idx` | INT | | 切片序号 |

**SQL Index**:
```sql
CREATE INDEX ON kms.document_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
```

#### `gov.faqs` (标准问答库)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `question` | TEXT | NOT NULL | |
| `answer` | TEXT | NOT NULL | |
| `embedding` | VECTOR(1536) | INDEX (HNSW) | 问题向量 |
| `category` | VARCHAR(50) | | |
| `status` | VARCHAR(20) | | DRAFT, APPROVED, PUBLISHED |

---

## 4. 知识图谱设计 (Graph Schema - Apache AGE)

利用 **Apache AGE** 扩展，在 Postgres 内部实现图存储。

*   **Graph Name**: `military_graph`

### 4.1 Vertex Labels (节点类型)
AGE 将节点存储在 `military_graph."Entity"` 等表中，但在概念模型上我们定义如下 Labels:

*   **Weapon** (武器装备): `{ name, code, service_date, country }`
*   **Manufacturer** (研制单位): `{ name, location, license_level }`
*   **System** (子系统): `{ name, type }` (e.g., 动力系统, 火控系统)
*   **Event** (事件): `{ name, date, description }` (e.g., 定型试验, 阅兵)
*   **Document** (关联文档): `{ doc_id, title }` (指向 `kms.documents`)

### 4.2 Edge Labels (关系类型)
*   **DEVELOPED_BY**: `Weapon` -> `Manufacturer`
*   **EQUIPPED_WITH**: `Weapon` -> `System`
*   **EVOLVED_FROM**: `Weapon` -> `Weapon` (e.g., 99式 -> 99A)
*   **PARTICIPATED_IN**: `Weapon` -> `Event`
*   **MENTIONED_IN**: `Weapon` -> `Document` (融合图谱与文档库)

### 4.3 Query Example (OpenCypher)
```sql
SELECT * FROM cypher('military_graph', $$
    MATCH (w:Weapon {name: '15式轻型坦克'})-[:EQUIPPED_WITH]->(s:System)
    RETURN w, s
$$) as (w agtype, s agtype);
```

---

## 5. 可拓展性与性能策略 (Scalability Strategy)

### 5.1 数据分区 (Partitioning)
*   **Audit Logs**: 强制按月分区。历史数据可定期转存至冷存储或通过 `pg_dump` 归档后 Truncate，保持在线表轻量。
*   **Vector Chunks**: 如果切片数量超过 1000万，建议按 `kb_id` 进行列表分区 (List Partitioning) 或哈希分区，缩小 HNSW 索引构建和检索的内存开销。

### 5.2 索引优化 (Indexing)
*   **JSONB**: 对 `kms.documents.meta` 使用 GIN 索引，支持任意元数据标签的毫秒级过滤。
*   **Full Text Search**: 对 `document_chunks.content` 建立 `tsvector` 倒排索引 (GIN)，实现 **关键词+向量** 的混合检索 (Hybrid Search/RRF)。

### 5.3 读写分离 (Read/Write Splitting)
*   **主库 (Primary)**: 处理写操作 (用户注册, 文档上传, 日志写入)。
*   **只读副本 (Read Replicas)**: 处理高频的 RAG 向量检索和图谱查询。向量计算是 CPU 密集型，分离后可保护主库稳定性。

### 5.4 缓存策略 (Redis)
*   **Session**: 存储用户 Token 及即时权限快照。
*   **Config**: 缓存 `dlp_policies` 和 `knowledge_base` 元数据，减少 DB IO。
*   **Query Result**: 缓存高频相同的 RAG 提问结果 (Key: QueryHash, Expire: 1h)。

---

## 6. 初始化脚本片段 (SQL Snippets)

```sql
-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "age";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- 2. Create Schema
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- 3. RLS Policies (Example for Documents)
ALTER TABLE kms.documents ENABLE ROW LEVEL SECURITY;

-- 仅允许用户访问其密级允许的文档
CREATE POLICY doc_clearance_policy ON kms.documents
    FOR SELECT
    USING (clearance <= (SELECT clearance_level FROM auth.users WHERE id = current_setting('app.current_user_id')::uuid));

-- 仅允许 KB 授权列表中的用户访问
-- (复杂逻辑通常在应用层 Service 处理，DB 层 RLS 作为最后一道防线)
```
