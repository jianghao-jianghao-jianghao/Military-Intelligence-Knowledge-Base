
# Copilot Instructions for Military Knowledge Base Project

This document outlines the coding standards, architectural patterns, and context for the "Military Intelligence & Knowledge Base" project. Please adhere to these rules when generating or modifying code.

## 1. Project Context & Technology Stack
- **Domain**: High-security Military R&D Knowledge Management System.
- **Framework**: React 19 (Functional Components + Hooks).
- **Language**: TypeScript (Strict Mode).
- **Build Tool**: Vite.
- **Styling**: Tailwind CSS (GitHub Design System inspired).
- **State Management**: React `useState`, `useEffect`, `useRef` (Local state preferred over global stores for this scale).
- **Backend**: Mocked Service Layer (`services/api.ts`) simulating a Python FastAPI backend.

## 2. Architecture & File Structure
- **Entry Point**: `index.tsx` mounting `App.tsx`.

- **Core Components**:
  - `Layout.tsx`: Main navigation and shell.
  - `QAView.tsx`: RAG-based Chat interface with evidence traceability.
  - `KnowledgeGraph.tsx`: D3-like SVG visualization for entities and relationships.
  - `DocProcessingView.tsx`: Agentic workflow tools (Write, Proofread, Format).
  - `AdminView.tsx`: Backend management (ACL, DLP, Audit Logs).
  - `SystemHealthCheck.tsx`: Integrated testing suite.
- **Services**: 
  - **`services/api.ts`**: The **ONLY** place for API calls. Contains all `fetch` mocks and Service objects (`AuthService`, `ChatService`, etc.).
  - *Deprecated*: Do NOT use `services/geminiService.ts`.
- **Types**: All shared interfaces (User, KB, Document, GraphData) are in `types.ts`.
- **Constants**: Mock data and UI constants (Colors, Icons) are in `constants.tsx`.

## 3. Coding Guidelines

### 3.1 Data Fetching & Services
- **Pattern**: Components must call methods exported from `services/api.ts` (e.g., `ChatService.sendMessage`).
- **Error Handling**: Wrap service calls in `try/catch` blocks within components. Use `alert()` or UI error states to notify users.
- **Mocking**: The backend is currently mocked. If adding a new feature, add a new mock endpoint in `mockRequest` function in `services/api.ts` first.

### 3.2 UI/UX & Styling
- **Theme**: Support both `light` and `dark` modes. Use `dark:` prefix for dark mode styles.
- **Color Palette**: 
  - Backgrounds: `bg-white` / `dark:bg-[#0d1117]`.
  - Borders: `border-[#d0d7de]` / `dark:border-[#30363d]`.
  - Accents: Blue (`#0366d6`), Green (`#238636`), Red (`#da3633`).
- **Fonts**: Use standard system fonts (`Inter`, `Noto Sans SC`) and `JetBrains Mono` for code/logs.
- **Icons**: Use the SVG icons defined in `constants.tsx`.

### 3.3 Security & Business Logic
- **Clearance Levels**: Respect `ClearanceLevel` enum (`UNCLASSIFIED`, `INTERNAL`, `CONFIDENTIAL`, `SECRET`).
- **Visual Cues**: 
  - Secret/Confidential items often need red/orange badges.
  - Internal items use green/blue.
- **Audit Logging**: Any critical action (Download, Print, Delete) implies a backend audit log entry (simulated).

### 3.4 Testing
- **Integration Tests**: Use `components/SystemHealthCheck.tsx` to validate flows.
- **New Features**: When adding a new critical flow, add a corresponding test case to `SystemHealthCheck.tsx`.

## 4. Specific Module Rules

### QA / Chat (`QAView.tsx`)
- Messages must support `thought_process` (reasoning steps) and `provenance` (citations).
- Evidence citation must link to specific document IDs.

### Knowledge Graph (`KnowledgeGraph.tsx`)
- Render using SVG within the component.
- Support "Normal", "Path Finding", and "Temporal Evolution" modes.
- Nodes and Edges must strictly follow `GraphData` interface.

### Document Processing (`DocProcessingView.tsx`)
- Use `AgentService` for operations.
- "Proofread" mode requires a side-by-side comparison view.
- "Format" mode simulates "Official Red-Head Document" rendering.

## 5. Do Not
- Do not introduce external state management libraries (Redux, Zustand) unless requested.
- Do not write raw `fetch` calls inside components; always use `services/api.ts`.
- Do not break the "GitHub Dark Mode" aesthetic.
