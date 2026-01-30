
import os
from typing import Dict, Type
from app.core.parsers.base import BaseFileParser
from app.core.parsers.text import TextParser
from app.core.parsers.office import DocxParser
from app.core.parsers.pdf import PdfParser

class ParserFactory:
    """
    文件解析器工厂 (Factory Pattern)
    负责管理所有已注册的解析器，并根据文件名分发。
    """
    
    def __init__(self):
        self._parsers: Dict[str, BaseFileParser] = {}
        self._register_defaults()

    def _register_defaults(self):
        """
        注册默认的解析器
        """
        self.register_parser(TextParser())
        self.register_parser(DocxParser())
        self.register_parser(PdfParser())

    def register_parser(self, parser: BaseFileParser):
        """
        注册一个新的解析器实例。
        如果未来有处理 .eml 的 EmailParser，调用此方法注册即可。
        """
        for ext in parser.supported_extensions:
            self._parsers[ext] = parser

    def get_parser(self, filename: str) -> BaseFileParser:
        """
        根据文件名后缀获取对应的解析器
        """
        _, ext = os.path.splitext(filename)
        ext = ext.lower()
        
        parser = self._parsers.get(ext)
        if not parser:
            raise ValueError(f"不支持的文件格式: {ext}。目前支持: {list(self._parsers.keys())}")
        
        return parser

# 全局单例工厂
parser_factory = ParserFactory()
