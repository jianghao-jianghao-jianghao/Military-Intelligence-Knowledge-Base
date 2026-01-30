
from abc import ABC, abstractmethod
from typing import List, Any
from fastapi import UploadFile

class BaseFileParser(ABC):
    """
    文件解析器抽象基类 (Abstract Base Class)
    所有具体的文件格式解析器都必须继承此类并实现 parse 方法。
    """

    @property
    @abstractmethod
    def supported_extensions(self) -> List[str]:
        """
        定义该解析器支持的文件扩展名列表 (小写, 带点)
        例如: ['.docx', '.doc']
        """
        pass

    @abstractmethod
    async def parse(self, file: UploadFile) -> str:
        """
        核心解析方法：将文件内容转换为 Markdown 格式字符串。
        
        Args:
            file (UploadFile): FastAPI 上传的文件对象
            
        Returns:
            str: 解析后的 Markdown 文本
        """
        pass
