
import json
import logging
from typing import Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.llm.base import BaseLLMProvider

logger = logging.getLogger(__name__)

class MockLLMProvider(BaseLLMProvider):
    """
    Mock 适配器：用于开发环境或断网测试
    """
    async def generate_text(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        logger.info(f"[MockLLM] Generating Text. System: {system_prompt[:20]}...")
        if "排版" in system_prompt:
            return "<div style='color:red'>[Mock HTML] 这是一个模拟的排版结果。</div>"
        return f"[Mock Response] 收到指令：{user_prompt[:20]}... (这是模拟生成的文本)"

    async def generate_json(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> Dict[str, Any]:
        logger.info(f"[MockLLM] Generating JSON. System: {system_prompt[:20]}...")
        # 返回一个通用的 Mock JSON 结构，实际业务中可能需要根据 prompt 特征返回不同 mock 数据
        return {
            "suggestions": [
                {"id": 1, "type": "mock", "original": "mock", "suggestion": "real", "reason": "Testing mode"}
            ]
        }

class OpenAILikeProvider(BaseLLMProvider):
    """
    OpenAI 兼容协议适配器
    支持: OpenAI, DeepSeek, Moonshot, vLLM, OneAPI 等
    """
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL
        )
        self.model = settings.LLM_MODEL_NAME

    async def generate_text(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM Provider Error: {str(e)}")
            raise ValueError(f"模型调用失败: {str(e)}")

    async def generate_json(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> Dict[str, Any]:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error("LLM returned invalid JSON")
            raise ValueError("模型返回了非法的 JSON 格式")
        except Exception as e:
            logger.error(f"LLM Provider Error: {str(e)}")
            raise ValueError(f"模型调用失败: {str(e)}")

# 若未来接入 Gemini 原生 SDK (google-generativeai)，可在此添加 GeminiProvider 类
# class GeminiProvider(BaseLLMProvider): ...
