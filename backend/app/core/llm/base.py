
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class BaseLLMProvider(ABC):
    """
    LLM 提供商抽象基类
    定义了所有 LLM 适配器必须实现的方法。
    """

    @abstractmethod
    async def generate_text(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        temperature: float = 0.7
    ) -> str:
        """
        生成纯文本响应
        """
        pass

    @abstractmethod
    async def generate_json(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        """
        生成 JSON 结构化响应
        """
        pass
