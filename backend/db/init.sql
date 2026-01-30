
-- 兵工研制大脑 Database Initialization Script
-- Based on db_schema.md v2.0

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "age";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- AGE Initialization
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- 2. Create Schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS kms;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS gov;

----------------------------------------------------------------
-- SCHEMA: AUTH (Identity & Access)
----------------------------------------------------------------

-- Departments (Hierarchy)
CREATE TABLE auth.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    parent_id UUID REFERENCES auth.departments(id),
    path LTREE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX dept_path_idx ON auth.departments USING GIST (path);

-- Roles
CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'
);

-- Users
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    department_id UUID REFERENCES auth.departments(id),
    role_id UUID REFERENCES auth.roles(id),
    clearance_level SMALLINT CHECK (clearance_level BETWEEN 0 AND 3), -- 0:非密, 1:内部, 2:秘密, 3:机密
    status VARCHAR(20) DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registration Requests
CREATE TABLE auth.registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    auditor_id UUID REFERENCES auth.users(id),
    justification TEXT,
    request_date TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------------------
-- SCHEMA: KMS (Knowledge Management)
----------------------------------------------------------------

-- Knowledge Bases
CREATE TABLE kms.knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_clearance SMALLINT NOT NULL,
    owner_id UUID REFERENCES auth.users(id),
    is_archived BOOLEAN DEFAULT FALSE,
    settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KB ACL (Access Control List)
CREATE TABLE kms.kb_acl (
    kb_id UUID REFERENCES kms.knowledge_bases(id) ON DELETE CASCADE,
    subject_type VARCHAR(10) CHECK (subject_type IN ('DEPT', 'ROLE', 'USER')),
    subject_id UUID NOT NULL,
    permission VARCHAR(20) DEFAULT 'READ',
    PRIMARY KEY (kb_id, subject_type, subject_id)
);

-- Documents
CREATE TABLE kms.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id UUID REFERENCES kms.knowledge_bases(id),
    title VARCHAR(255) NOT NULL,
    file_hash CHAR(64),
    s3_key VARCHAR(512) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(50),
    page_count INT,
    clearance SMALLINT NOT NULL,
    status VARCHAR(20) DEFAULT 'INDEXING',
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_docs_meta ON kms.documents USING GIN (meta);
CREATE INDEX idx_docs_hash ON kms.documents (file_hash);

-- Document Chunks (Vector Store)
CREATE TABLE kms.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID REFERENCES kms.documents(id) ON DELETE CASCADE,
    kb_id UUID NOT NULL, -- Denormalized for partitioning/filtering
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Dimension matches OpenAI/modern embedding models
    page_idx INT,
    chunk_idx INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector Index (HNSW)
CREATE INDEX idx_chunks_embedding ON kms.document_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Full Text Search Index
CREATE INDEX idx_chunks_content_fts ON kms.document_chunks USING GIN (to_tsvector('simple', content));

----------------------------------------------------------------
-- SCHEMA: CHAT (Conversations & RAG)
----------------------------------------------------------------

-- Conversations
CREATE TABLE chat.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    title VARCHAR(200),
    bound_kb_ids UUID[],
    config_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE chat.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES chat.conversations(id) ON DELETE CASCADE,
    role VARCHAR(10) CHECK (role IN ('user', 'assistant')),
    content TEXT,
    thought_chain JSONB, -- For Chain-of-Thought
    citations JSONB, -- Provenance
    tokens_usage INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_msg_conv_time ON chat.messages (conversation_id, created_at);

-- Feedback (RLHF)
CREATE TABLE chat.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES chat.messages(id),
    score SMALLINT CHECK (score IN (-1, 0, 1)),
    comment TEXT,
    is_reviewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------------------
-- SCHEMA: GOV (Governance & Audit)
----------------------------------------------------------------

-- Audit Logs (Partitioned by Month recommended for prod, using simple table for dev)
CREATE TABLE gov.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    trace_id UUID,
    user_id UUID,
    user_name VARCHAR(100), -- Denormalized for immutable logs
    action VARCHAR(50) NOT NULL,
    resource_target VARCHAR(255),
    ip_address INET,
    user_agent VARCHAR(255),
    status SMALLINT, -- 1 Success, 0 Fail
    detail JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_time ON gov.audit_logs (created_at);
CREATE INDEX idx_audit_user ON gov.audit_logs (user_id);

-- DLP Policies
CREATE TABLE gov.dlp_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern VARCHAR(100) NOT NULL,
    replacement VARCHAR(100),
    action VARCHAR(20) DEFAULT 'MASK',
    severity VARCHAR(20) DEFAULT 'high',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQs (Vectorized)
CREATE TABLE gov.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    embedding VECTOR(1536),
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'DRAFT',
    clearance SMALLINT DEFAULT 1,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_faq_embedding ON gov.faqs USING hnsw (embedding vector_cosine_ops);

----------------------------------------------------------------
-- SCHEMA: GRAPH (Apache AGE)
----------------------------------------------------------------
-- Initialize the Graph
SELECT create_graph('military_graph');

-- Note: Vertices and Edges in AGE are created dynamically via Cypher queries
-- e.g., SELECT * FROM cypher('military_graph', $$ CREATE (n:Weapon {name: '15式'}) $$) as (n agtype);

----------------------------------------------------------------
-- SEED DATA (Initial Setup)
----------------------------------------------------------------

-- Insert Root Department
INSERT INTO auth.departments (id, name, code, path) 
VALUES ('d1000000-0000-0000-0000-000000000001', '兵工集团总部', 'HQ', 'd1000000-0000-0000-0000-000000000001');

-- Insert Super Admin Role
INSERT INTO auth.roles (id, name, permissions) 
VALUES ('r1000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', '["*"]');

-- Insert Default Admin User (Password: admin)
-- Hash generated using Argon2 via passlib
INSERT INTO auth.users (username, password_hash, full_name, department_id, role_id, clearance_level, status)
VALUES (
    'admin', 
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxwKc.6IymVFt77R.2q.F.1r.1.1.', -- 'admin'
    'System Administrator',
    'd1000000-0000-0000-0000-000000000001',
    'r1000000-0000-0000-0000-000000000001',
    3, -- TOP SECRET
    'ACTIVE'
);
