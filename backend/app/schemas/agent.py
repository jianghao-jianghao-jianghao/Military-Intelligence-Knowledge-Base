
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal

# --- Agent Request Schemas ---

class AgentWriteRequest(BaseModel):
    """
    智能写作请求
    """
    topic: str = Field(..., description="文档主题", example="关于2024年第一季度装甲研发进度的总结报告")
    outline: Optional[str] = Field(None, description="大纲或核心要点", example="1. 概述本季度主要任务...")

class AgentOptimizeRequest(BaseModel):
    """
    文案优化请求
    """
    content: str = Field(..., description="待优化的原始文本")
    instruction: Optional[str] = Field(None, description="优化指令/侧重点", example="将语气调整得更加委婉，突出团队贡献")

class AgentFormatRequest(BaseModel):
    """
    智能排版请求
    """
    content: str = Field(..., description="待排版的 Markdown 或纯文本")
    style: str = Field(..., description="排版风格标准", example="Official Red-Head Doc")

class AgentExportRequest(BaseModel):
    """
    导出请求
    """
    html_content: str = Field(..., description="前端渲染好的或后端生成的 HTML 内容")
    format: Literal['pdf', 'docx'] = Field(..., description="导出目标格式")
    filename: str = Field("document", description="下载文件名")

class AgentProofreadRequest(BaseModel):
    """
    智能校对请求
    """
    content: str = Field(..., description="待校对的草稿内容 (Markdown)")
    reference_style: Optional[str] = Field(None, description="从参考文档学习到的格式规范描述 (Markdown)", example="1. 标题必须居中...")
    custom_instruction: Optional[str] = Field(None, description="用户自定义的额外校对指令")

# --- Agent Response Schemas ---

class ProofreadSuggestion(BaseModel):
    """
    校对建议项
    """
    id: int
    type: str = Field(..., description="错误类型: format(格式), typo(错别字), term(专有名词), logic(逻辑)")
    original: str = Field(..., description="原文片段")
    suggestion: str = Field(..., description="修改建议")
    reason: str = Field(..., description="修改理由/依据的标准")
    
    model_config = ConfigDict(from_attributes=True)

class AgentExportResponse(BaseModel):
    """
    导出响应
    """
    download_url: str
    file_type: str

class StyleLearnResponse(BaseModel):
    """
    格式学习响应
    """
    style_description: str = Field(..., description="学习到的格式规范 (Markdown 格式)")
    preview_html: Optional[str] = Field(None, description="标准样式的 HTML 预览片段")
