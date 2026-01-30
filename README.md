
# 兵工研制大脑 (Military Intelligence & Knowledge Base)

[![React](https://img.shields.io/badge/React-19.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple)](https://vitejs.dev/)
[![Security](https://img.shields.io/badge/Security-Clearance_Required-red)]()

A high-security, intelligent knowledge management platform designed for military R&D institutes. It integrates **RAG** (Retrieval-Augmented Generation), **Knowledge Graphs**, and **Agentic Workflows** to assist researchers in accessing, analyzing, and generating classified technical documents while maintaining strict security compliance.

![Dashboard Preview](https://via.placeholder.com/800x450?text=System+Dashboard+Preview)

## ✨ Core Features

### 1. 🔐 Secure Intelligent QA (RAG)
*   **Multi-Tier Retrieval**: Hybrid search across FAQs, Knowledge Graphs (AGE), and Vector Docs (pgvector).
*   **Traceability**: Every answer cites specific document paragraphs with confidence scores.
*   **Chain of Thought**: Visualizes the reasoning process (Query Rewrite -> Search -> Verify).

### 2. 🕸️ Knowledge Graph Visualization
*   **Entity Browser**: Interactive exploration of Weapons, Manufacturers, and Systems.
*   **Path Discovery**: Find hidden relationships between entities (e.g., supply chain risks).
*   **Temporal Evolution**: Time-travel view of weapon system development history.

### 3. 🛡️ Governance & Security
*   **RBAC & ACL**: Granular access control down to the document level based on Clearance (Secret/Confidential).
*   **DLP (Data Loss Prevention)**: Real-time sensitive word interception and masking.
*   **Audit Logging**: Immutable logging of every print, download, and access action.

### 4. 📝 Intelligent Document Workshop
*   **Agentic Tools**: Smart Write, Optimize, and Format (Red-Head Official Doc generation).
*   **Proofread**: Side-by-side compliance check against standard references.

## 🛠️ Technology Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS (GitHub Design System).
*   **Build Tool**: Vite.
*   **Visualization**: SVG (D3-like implementation for Graph).
*   **Architecture**:
    *   **Components**: Functional components with Hooks.
    *   **Services**: Centralized API service layer (`services/api.ts`).
    *   **Mocking**: Built-in mock data for offline demonstration and testing.

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-org/weapon-knowledge-base.git
    cd weapon-knowledge-base
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:5173` in your browser.

## 📂 Project Structure

```
├── components/          # React Components
│   ├── Layout.tsx       # Main Shell & Sidebar
│   ├── QAView.tsx       # RAG Chat Interface
│   ├── KnowledgeGraph.tsx # Graph Visualization
│   ├── AdminView.tsx    # Governance Dashboard
│   ├── DocProcessingView.tsx # Agent Tools
│   └── ...
├── services/
│   └── api.ts           # API Service Layer & Mock Data
├── types.ts             # TypeScript Interfaces (Database Models)
├── constants.tsx        # UI Constants & Mock Initial Data
├── App.tsx              # Main Application Router/Logic
└── index.html           # Entry HTML
```

## 🧪 System Health Check

The system includes a built-in diagnostic tool.
1.  Navigate to **后台管理中心 (Admin)** -> **系统健康 (Health)**.
2.  Click **Run Full Diagnostic** to execute integration tests across Auth, Doc, Chat, and Graph modules.

## ⚠️ Security Notice

This application is a **frontend prototype**.
*   **Data Persistence**: All data is stored in-memory (RAM) and will reset on refresh.
*   **Authentication**: Uses a mock `luyangong / 123` credential set.
*   **Production Deployment**: Requires a real Python FastAPI backend with PostgreSQL/pgvector and Redis.

## 📄 Documentation

*   [Database Schema](./db_schema.md)
*   [API Documentation](./api_docs.md)
*   [Product Specification](./spec.md)
