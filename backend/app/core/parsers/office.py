
import io
import docx
from typing import List
from fastapi import UploadFile
from app.core.parsers.base import BaseFileParser

class DocxParser(BaseFileParser):
    """
    Word 文档解析器 (.docx)
    使用 python-docx 库提取文本并尝试还原简单的 Markdown 结构（标题、列表）。
    """

    @property
    def supported_extensions(self) -> List[str]:
        return [".docx", ".dotx"]

    async def parse(self, file: UploadFile) -> str:
        content = await file.read()
        await file.seek(0)
        
        # 将字节流转换为内存中的 BytesIO 对象供 python-docx 读取
        file_stream = io.BytesIO(content)
        
        try:
            return self._docx_to_markdown(file_stream)
        except Exception as e:
            return f"Error parsing DOCX file: {str(e)}"

    def _docx_to_markdown(self, file_stream: io.BytesIO) -> str:
        """
        内部逻辑：将 docx 对象转换为 md 字符串
        """
        doc = docx.Document(file_stream)
        md_lines = []
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            
            # 根据 Word 样式名称映射 Markdown 标记
            # 注意：不同 Word 版本样式名可能不同，这里做基础匹配
            style_name = para.style.name.lower()
            
            if 'heading 1' in style_name or '标题 1' in style_name:
                md_lines.append(f"# {text}")
            elif 'heading 2' in style_name or '标题 2' in style_name:
                md_lines.append(f"## {text}")
            elif 'heading 3' in style_name or '标题 3' in style_name:
                md_lines.append(f"### {text}")
            elif 'list' in style_name or '列表' in style_name:
                md_lines.append(f"- {text}")
            elif 'quote' in style_name:
                md_lines.append(f"> {text}")
            else:
                # 普通正文
                md_lines.append(text)
                
        return "\n\n".join(md_lines)
