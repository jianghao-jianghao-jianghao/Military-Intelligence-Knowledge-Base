
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# 创建异步数据库引擎
# echo=True 在开发环境开启 SQL 日志，方便调试
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.ENVIRONMENT == "dev"),
    future=True
)

# 创建异步会话工厂
# expire_on_commit=False 是异步模式下的必须设置，防止 commit 后属性访问触发同步 IO
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False
)

async def get_db():
    """
    FastAPI 依赖项：获取数据库会话。
    使用 yield 生成器确保请求结束后自动关闭会话。
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
