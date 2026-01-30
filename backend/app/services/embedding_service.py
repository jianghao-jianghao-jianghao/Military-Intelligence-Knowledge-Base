
from typing import List
import openai
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    向量化服务
    负责将文本转换为高维向量 (Embeddings)。
    """
    
    def __init__(self):
        # 如果配置了 OpenAI Key，初始化客户端
        # 也可以扩展支持 HuggingFace / SentenceTransformers 本地模型
        if settings.LLM_PROVIDER == "openai" or settings.LLM_PROVIDER == "deepseek":
            self.client = openai.AsyncOpenAI(
                api_key=settings.LLM_API_KEY,
                base_url=settings.LLM_BASE_URL
            )
        else:
            self.client = None

    async def get_embedding(self, text: str) -> List[float]:
        """
        获取单文本向量
        """
        if not self.client:
            return self._mock_embedding()
            
        try:
            # 移除换行符以优化向量质量
            text = text.replace("\n", " ")
            response = await self.client.embeddings.create(
                input=[text],
                model=settings.EMBEDDING_MODEL
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            # Fallback to mock in dev/error cases to keep system running
            return self._mock_embedding()

    def _mock_embedding(self) -> List[float]:
        """
        生成伪随机向量 (用于开发环境/无 Key 状态)
        保持维度一致 (1536)
        """
        import random
        # 固定种子以便在 Mock 环境下相同的文本产生相同的"随机"向量（可选）
        return [random.random() for _ in range(settings.EMBEDDING_DIMENSION)]

embedding_service = EmbeddingService()
