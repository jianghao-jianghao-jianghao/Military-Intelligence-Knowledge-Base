
from functools import lru_cache
from app.core.config import settings
from app.core.llm.base import BaseLLMProvider
from app.core.llm.providers import OpenAILikeProvider, MockLLMProvider

class LLMFactory:
    @staticmethod
    @lru_cache() # 缓存实例，避免重复创建连接池
    def get_provider() -> BaseLLMProvider:
        provider_type = settings.LLM_PROVIDER.lower()
        
        if provider_type == "mock":
            return MockLLMProvider()
        
        elif provider_type in ["openai", "deepseek", "bailian"]:
            # DeepSeek 和 阿里百炼(兼容模式) 都使用 OpenAI 协议
            return OpenAILikeProvider()
        
        elif provider_type == "gemini":
            # 如果配置了 gemini 但使用 openai 兼容接口访问 (如通过 OneAPI)
            if "openai" in settings.LLM_BASE_URL:
                return OpenAILikeProvider()
            else:
                # TODO: 实现原生 Google Gemini Provider
                return MockLLMProvider() 
        
        else:
            return MockLLMProvider()

# 全局单例访问点
def get_llm() -> BaseLLMProvider:
    return LLMFactory.get_provider()
