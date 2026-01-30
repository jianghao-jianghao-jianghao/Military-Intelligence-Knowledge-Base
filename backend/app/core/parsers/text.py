
from typing import List
from fastapi import UploadFile
from app.core.parsers.base import BaseFileParser

class TextParser(BaseFileParser):
    """
    纯文本与 Markdown 解析器
    处理 .txt, .md 等无需复杂解码的格式。
    """

    @property
    def supported_extensions(self) -> List[str]:
        return [".txt", ".md", ".json", ".log"]

    async def parse(self, file: UploadFile) -> str:
        """
        直接读取字节流并按 UTF-8 解码
        """
        content = await file.read()
        # 记得重置文件指针，以防其他组件需要再次读取
        await file.seek(0)
        
        try:
            return content.decode("utf-8", errors="ignore")
        except Exception as e:
            return f"Error decoding text file: {str(e)}"
