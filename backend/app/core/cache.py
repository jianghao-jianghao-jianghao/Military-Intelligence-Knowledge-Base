
import json
from typing import Any, Optional
from redis import asyncio as aioredis
from app.core.config import settings

class CacheService:
    """
    Redis 缓存服务封装
    """
    def __init__(self):
        self.redis = aioredis.from_url(
            f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}",
            password=settings.REDIS_PASSWORD or None,
            encoding="utf-8",
            decode_responses=True
        )

    async def get(self, key: str) -> Optional[Any]:
        """
        获取缓存，尝试自动反序列化 JSON
        """
        try:
            val = await self.redis.get(key)
            if not val:
                return None
            try:
                return json.loads(val)
            except json.JSONDecodeError:
                return val
        except Exception as e:
            # 缓存失败不应阻塞主流程
            print(f"Cache GET error: {e}")
            return None

    async def set(self, key: str, value: Any, expire: int = 3600):
        """
        设置缓存，自动序列化 JSON
        """
        try:
            if isinstance(value, (dict, list)):
                val_str = json.dumps(value)
            else:
                val_str = str(value)
            
            await self.redis.set(key, val_str, ex=expire)
        except Exception as e:
            print(f"Cache SET error: {e}")

    async def delete(self, key: str):
        await self.redis.delete(key)

    async def close(self):
        await self.redis.close()

cache = CacheService()
