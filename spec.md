
# Product Specification: Military Intelligence & Knowledge Base (兵工研制大脑)

## 1. Product Vision
A high-security, intelligent knowledge management platform designed for military R&D institutes. It integrates RAG (Retrieval-Augmented Generation), Knowledge Graphs, and Agentic Workflows to assist researchers in accessing, analyzing, and generating classified technical documents while maintaining strict security compliance.

## 2. Core Modules & Features

### 2.1 Secure Intelligent QA (RAG Engine)
- **Multi-Source Retrieval**: Retrieves information from three tiers:
  1.  **FAQ**: High-confidence curated Q&A pairs.
  2.  **Knowledge Graph**: Entity relationships and logical inference paths.
  3.  **Unstructured Docs**: Vector search on PDF/Word technical archives.
- **Evidence Traceability**: Every answer includes a "Provenance" panel listing source documents, specific paragraphs, and confidence scores.
- **Advanced Reasoning**: Displays "Chain of Thought" (Query Rewrite -> Sub-query -> Verification).
- **Session Management**: Rename, delete, and export chat sessions (ZIP evidence packages).

### 2.2 Knowledge Graph Visualization
- **Entity Browser**: Interactive SVG-based graph visualization of Weapons, Manufacturers, and Systems.
- **Path Discovery**: Find shortest paths between two entities (e.g., Supplier relationship chains).
- **Temporal Evolution**: Time-slider view to see how weapon systems evolved from Project Init -> Prototype -> Service.

### 2.3 Document Center & Archives
- **Access Control (RBAC/ACL)**: Granular permissions based on Department and Clearance Level (Secret/Confidential/Internal).
- **Ingestion**: Upload support for PDF, DOCX, XLSX. Simulates OCR and text extraction.
- **Security Operations**:
  - **Desensitization**: On-the-fly generation of redacted copies for low-clearance environments.
  - **Print Control**: Watermarked preview and audit-logged print application workflow.

### 2.4 Intelligent Document Workshop (Agentic Tools)
- **Smart Write**: Generate outlines and drafts based on topics.
- **Optimize**: Polish text tone and clarity based on instructions.
- **Format**: Auto-layout content into standard "Red-Head Official Documents" (GB/T 9704).
- **Proofread**: Side-by-side comparison detecting typos, formatting errors, and logic gaps against standard references.

### 2.5 Admin Governance & Security
- **User Management**: Lifecycle management (Register -> Approve -> Active -> Lock).
- **KB Asset Management**: Create/Edit Knowledge Bases and define white-lists (Dept/Role/User).
- **DLP Policies**: Define sensitive words (e.g., "DF-17") and masking rules.
- **Audit Logs**: Immutable logs of all user actions (Access, Download, Search), exportable to PDF.
- **System Health**: Built-in integration test suite for self-diagnosis.

## 3. User Roles & Permissions

| Role | Permissions |
| :--- | :--- |
| **Super Admin (总研制师)** | Full access to all modules, User/KB management, Audit logs, Policy config. |
| **KB Manager (机密审计员)** | Manage KBs, View Audit Logs, Approve/Reject Registrations & FAQs. |
| **User (普通研究员)** | Search/QA, View authorized KBs, Use Agent Tools, Submit print/download applications. |

## 4. Data Entities (Key Types)

### User
- `id`, `username`, `departmentId`, `clearance` (Secret/Confidential/Internal).

### Knowledge Base (KB)
- `authorized_departments`, `authorized_roles`, `authorized_users`.

### Document
- `clearance`, `content_preview`, `kb_id`.

### Audit Log
- `timestamp`, `action`, `resource`, `status`, `userId`.

## 5. Technical Architecture

### Frontend
- **Stack**: React 19, TypeScript, Tailwind CSS.
- **Theme**: Dark/Light mode support (GitHub UI style).

### Backend (Simulated)
- **Service Layer**: `services/api.ts` acts as the interface.
- **Mock Data**: In-memory storage initialized from `constants.tsx` to simulate database persistence during the session.
- **API Protocol**: JSON-based RESTful style.

## 6. Success Metrics (System Health)
- **Coverage**: The `SystemHealthCheck` component must pass 100% of defined critical paths (Auth, Admin, Doc, Chat, Graph, Agent).
- **Latency**: Mocked latency ~400ms to simulate real-world network conditions.
- **Security**: Zero unauthorized access allowed (validated by negative test cases).
