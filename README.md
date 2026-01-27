<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Military Intelligence Knowledge Base

一个演示型的前端应用，包含问答视图、知识图谱与证据面板，使用本仓库中的服务与组件可以快速搭建基于大模型（Gemini 等）的知识检索与问答原型。

## 主要特性

- 前端 React/TypeScript 项目结构
- QA 与证据面板组件
- 与模型服务的简单集成（见 `services/geminiService.ts`）

## 快速开始（使用 pnpm）

确保已安装 Node.js 与 pnpm：

```bash
# 可选：启用 corepack 后直接使用 pnpm
corepack enable
# 或者全局安装 pnpm
npm i -g pnpm
```

安装依赖并启动开发服务器：

```bash
pnpm install
pnpm run dev
```

开发时常用命令：

- `pnpm run dev` — 启动开发服务器
- `pnpm run build` — 生产构建
- `pnpm run preview` — 预览构建产物

## 环境变量

创建 `.env.local` 并配置模型密钥（示例）：

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

密钥也可以通过系统环境变量设置，确保不要将密钥提交到仓库。

## 项目结构（摘录）

- `src/components` — React 组件
- `src/services/geminiService.ts` — 模型调用封装
- `index.tsx`, `App.tsx` — 应用入口

（完整结构请查看仓库文件）

## 贡献

欢迎贡献：

1. Fork 本仓库
2. 新分支实现功能或修复：`git checkout -b feat/xxx`
3. 提交并发起 Pull Request

请在 PR 中说明变更目的与影响范围。

## 许可证

本项目默认采用 MIT 许可证（如果需要，请在仓库中添加 `LICENSE` 文件以明确许可）。

## 作者

- 项目维护者：请在此处填写作者或组织信息

## 支持和联系

如需帮助或希望部署到特定平台（Vercel、Netlify、Cloud Run 等），请告诉我目标平台，我可以补充部署步骤。

---

文件：`README.md` 已更新以移除 AI Studio 专属标识并补充常见的 GitHub README 部分。
