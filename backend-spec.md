
# 兵工研制大脑 - 后端技术规格说明书 (Backend Specification)

## 1. 项目概况
本项目是"兵工研制大脑"的服务端实现，旨在为军工科研提供高密级、智能化的知识管理与问答服务。
核心挑战在于融合 **RBAC 权限控制**、**RAG 向量检索** 与 **图谱推理**，并确保数据流转符合军工安全标准。

## 2. 技术栈选型 (Tech Stack)

### 核心框架
*   **Language**: Python 3.11+
*   **Web Framework**: FastAPI (v0.109+) - 高性能、异步、自动生成 OpenAPI 文档。
*   **Server**: Uvicorn (ASGI) + Gunicorn (Process Manager).

### 数据持久化
*   **ORM**: SQLAlchemy 2.0+ (AsyncIO mode) - 必须使用 2.0 风格的查询语法。
*   **Database**: PostgreSQL 16
    *   Extension `pgvector`: 存储 1536 维度的文本向量。
    *   Extension `age`: Apache AGE，用于图数据库存储 (OpenCypher 支持)。
*   **Migrations**: Alembic - 数据库版本管理。
*   **Caching**: Redis 7.x - 用于 Session 存储、Celery 队列及高频热点缓存。
*   **Blob Storage**: MinIO (S3 Compatible) - 存储 PDF/Office 原始文件。

### AI 与 RAG 管道
*   **LLM Orchestration**: LangChain v0.1+ 或 LlamaIndex (首选 LangChain).
*   **Embedding Model**: HuggingFace `sentence-transformers` (本地部署) 或 OpenAI API (开发环境).
*   **PDF Parsing**: `unstructured` 或 `PyMuPDF`.

### 基础设施
*   **Containerization**: Docker & Docker Compose.
*   **Package Manager**: Poetry (推荐) 或 `uv`.

## 3. 系统架构设计 (Architecture)

采用 **分层架构 (Layered Architecture)**，严格分离关注点：

```
backend/
├── app/
│   ├── api/                # 路由层 (Routers) - 处理 HTTP 请求/响应，不做业务逻辑
│   │   ├── v1/
│   │   │   ├── endpoints/  # auth, chat, graph, documents, admin
│   │   │   └── api.py      # 路由汇总
│   ├── core/               # 核心配置 (Config, Security, Events)
│   ├── crud/               # 数据库操作层 (CRUD) - 仅负责 SQL 交互
│   ├── db/                 # 数据库连接 (Session, Base Model)
│   ├── models/             # SQLAlchemy ORM 模型定义
│   ├── schemas/            # Pydantic 数据验证模型 (Request/Response)
│   ├── services/           # 业务逻辑层 (Services) - RAG 流程, 图谱算法, 权限校验
│   │   ├── rag_engine.py
│   │   ├── graph_engine.py
│   │   └── auth_service.py
│   └── utils/              # 工具函数
├── tests/                  # Pytest 测试用例
├── alembic/                # 数据库迁移脚本
├── Dockerfile
└── pyproject.toml
```

## 4. 关键模块实现细节

### 4.1 认证与授权 (Auth Module)
*   **协议**: OAuth2 with Password Flow (Bearer Token).
*   **Token**: JWT (HS256), 包含 `sub`(username), `role`, `clearance`, `dept_id`.
*   **密码哈希**: Argon2 (通过 `passlib`).
*   **依赖注入**: 实现 `get_current_active_user` 和 `get_current_admin` 依赖，在 Router 层直接获取当前用户对象。

### 4.2 知识资产管理 (KMS Module)
*   **文件上传**: 使用 `UploadFile` 接收流，计算 SHA-256 哈希去重。
*   **元数据**: 存入 PG `kms.documents` 表。
*   **文件存储**: 存入 MinIO，Bucket 按密级隔离 (`bucket-secret`, `bucket-internal`).
*   **向量化 (Ingestion)**: 这是一个 **异步任务 (Background Task)**。
    1.  接收文件 -> 存 MinIO -> 写入 DB (Status: PENDING).
    2.  触发 Celery 任务 -> 解析文本 -> Chunking (500 tokens) -> Embedding -> 写入 `pgvector`.
    3.  更新 DB (Status: READY).

### 4.3 RAG 问答引擎 (Chat Module)
*   **Hybrid Search (混合检索)**:
    1.  **Keyword**: 使用 PG `tsvector` 进行全文检索。
    2.  **Vector**: 使用 `pgvector` (Cosine Distance) 检索 top-k。
    3.  **Rerank**: (可选) 使用 Cross-Encoder 对混合结果重排序。
*   **Context Assembly**: 根据 `token_limit` 组装 Prompt。
*   **LLM Call**: 调用 LLM (GPT-4/Qwen/DeepSeek) 生成回答。
*   **Streaming**: 使用 Server-Sent Events (SSE) 流式返回生成的文字。

### 4.4 知识图谱 (Graph Module)
*   **Apache AGE 集成**:
    *   不要使用原生的 Python AGE 驱动 (维护度低)，推荐使用 SQLAlchemy 执行原生 SQL 包装 Cypher 查询。
    *   示例: `session.execute(text("SELECT * FROM cypher('military_graph', $$ MATCH (n) RETURN n $$) as (n agtype);"))`
*   **图谱构建**: 在文档入库时，利用 LLM 提取实体关系 (Entity Extraction)，异步写入图数据库。

## 5. API 接口规范
*   严格遵循 `api_docs.md` 中定义的 URL 结构和 JSON 格式。
*   所有 Response 必须使用 `schemas.ApiResponse[T]` 进行包装，确保 `code`, `message`, `data` 结构统一。
*   错误处理：使用 `HTTPException`，并定义全局 Exception Handler 捕获未知错误。

## 6. 安全规范 (Security)
*   **环境变量**: 所有密钥 (DB URL, JWT Secret, MinIO Key) 必须从 `.env` 读取。
*   **SQL 注入**: 严禁拼接 SQL，必须使用 SQLAlchemy 参数化查询。
*   **CORS**: 仅允许前端域名访问。
