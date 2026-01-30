
from typing import List
from fastapi import UploadFile
from app.core.parsers.base import BaseFileParser

class PdfParser(BaseFileParser):
    """
    PDF 文档解析器
    当前为基础实现。
    
    【拓展说明】:
    未来如果接入 'unstructured' 或 'PyMuPDF'，只需修改这里的 parse 方法。
    甚至可以调用外部 OCR API 处理扫描件。
    """

    @property
    def supported_extensions(self) -> List[str]:
        return [".pdf"]

    async def parse(self, file: UploadFile) -> str:
        content = await file.read()
        await file.seek(0)
        
        # TODO: 集成真实的 PDF 提取库 (如 pypdf, pdfminer.six)
        # 这里仅做 Mock 返回，避免引入过多未声明的依赖导致运行报错
        
        return f"[System: PDF Content Extraction]\nFilename: {file.filename}\nSize: {len(content)} bytes\n\n(To enable real PDF parsing, please install 'pypdf' and update 'backend/app/core/parsers/pdf.py')"
