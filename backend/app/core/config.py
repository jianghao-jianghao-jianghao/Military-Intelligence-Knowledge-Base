
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Literal

class Settings(BaseSettings):
    """
    系统配置类
    读取环境变量并提供类型安全的配置访问。
    """
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

    # --- 基础信息 ---
    PROJECT_NAME: str = "Military Brain"
    API_V1_STR: str = "/api/v1"
    DOMAIN: str = "localhost"
    ENVIRONMENT: str = "dev"

    # --- 安全配置 ---
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    ALGORITHM: str = "HS256"

    # --- 数据库配置 ---
    DATABASE_URL: str

    # --- Redis 配置 ---
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""

    # --- 跨域配置 (CORS) ---
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # --- AI 模型配置 (重构后) ---
    # 选用的 LLM 供应商: openai, deepseek, gemini, bailian, mock
    LLM_PROVIDER: Literal["openai", "deepseek", "gemini", "bailian", "mock"] = "mock"
    
    # 通用 API Key
    LLM_API_KEY: str = ""
    
    # Base URL (用于 OpenAI 兼容协议，如 DeepSeek, vLLM, OneAPI)
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    
    # 模型名称
    LLM_MODEL_NAME: str = "gpt-3.5-turbo"
    
    # 嵌入模型配置
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536

    # --- 存储配置 ---
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_INTERNAL: str = "military-internal"
    MINIO_BUCKET_SECRET: str = "military-secret"

settings = Settings()
