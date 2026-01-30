
from fastapi import APIRouter
from app.api.v1.endpoints import auth, chat, graph, documents, agent, admin

api_router = APIRouter()

# 注册 Auth 模块路由
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# 注册 Chat 模块路由
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

# 注册 Graph 模块路由
api_router.include_router(graph.router, prefix="/graph", tags=["graph"])

# 注册 Documents 模块路由
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])

# 注册 Agent 模块路由 (智能文档工坊)
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])

# 注册 Admin 模块路由 (后台管理)
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
