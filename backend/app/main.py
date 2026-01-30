
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    兵工研制大脑后端 API 服务
    
    ## 核心功能
    * **Auth**: 用户认证与权限管理 (RBAC + ACL)
    * **Documents**: 知识库文档上传、解析与管理
    * **Chat**: 基于 RAG 的智能问答 (支持 pgvector 向量检索)
    * **Graph**: 知识图谱查询与推理 (Apache AGE)
    * **Agent**: 智能文档工坊 (写作、校对、排版)
    
    ## 鉴权说明
    点击右侧 **Authorize** 按钮，输入用户名 `admin` 和密码 `admin` (默认) 进行登录。
    登录成功后，Token 将自动附加到所有 API 请求头中。
    """,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",   # Swagger UI 地址
    redoc_url="/redoc", # ReDoc 地址
)

# 配置 CORS (跨域资源共享)
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# 注册 API 路由
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", include_in_schema=False)
async def root():
    """
    根路径重定向到 Swagger 文档
    """
    return RedirectResponse(url="/docs")

@app.get("/health", tags=["system"])
async def health_check():
    """
    健康检查端点 (K8s/Docker Probe)
    """
    return {"status": "ok", "project": settings.PROJECT_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
