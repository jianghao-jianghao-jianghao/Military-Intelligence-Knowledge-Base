
import json
import logging
import base64
from typing import List, Any
from fastapi import UploadFile

from app.schemas.agent import (
    AgentWriteRequest, AgentOptimizeRequest, AgentFormatRequest, 
    AgentProofreadRequest, ProofreadSuggestion, AgentExportRequest, AgentExportResponse,
    StyleLearnResponse
)
from app.utils.file_converter import file_converter
from app.core.llm.factory import get_llm
from app.core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

class AgentService:
    """
    智能文档工坊 Agent 服务 (重构版)
    负责业务逻辑组装，调用底层 LLM 接口。
    """

    # --- 排版标准注册表 ---
    FORMAT_STANDARDS = {
        "公文 (Official Red-Head Doc)": {
            "description": "中国党政机关公文格式 (GB/T 9704-2012)。包含红头、发文字号、分割线、标准字体(仿宋/黑体)及版式。",
            "css_requirements": "Use 'SimSun' for body, 'SimHei' for headers. Red headers. A4 page sizing.",
            "prompt_suffix": "必须生成带有 inline CSS 的 HTML。包含 <div class='red-header'>...</div>, 发文字号, 签发人等占位符。"
        },
        "技术报告 (Technical Report)": {
            "description": "科研技术报告标准格式 (GB/T 7713)。侧重章节层级、图表索引、参考文献格式。",
            "css_requirements": "Clean, academic layout. Times New Roman or Songti. Numbered headings (1.1, 1.1.1).",
            "prompt_suffix": "生成学术风格 HTML。自动为标题添加层级编号。"
        },
        "合同 (Legal Contract)": {
            "description": "严谨法律合同格式。包含甲乙方定义、条款缩进、签字盖章区。",
            "css_requirements": "Justified text alignment. Clause indentation. Signature block at bottom.",
            "prompt_suffix": "生成合同样式 HTML。条款清晰，段落两端对齐。"
        }
    }

    def __init__(self):
        # 通过工厂获取当前配置的 LLM 实例
        self.llm = get_llm()

    async def write(self, req: AgentWriteRequest) -> str:
        # 使用模板组装 Prompt
        user_prompt = PromptTemplate.AGENT_WRITE_USER.value.format(
            topic=req.topic, 
            outline=req.outline or '请自行构思合理大纲'
        )
        return await self.llm.generate_text(
            system_prompt=PromptTemplate.AGENT_WRITE_SYSTEM.value,
            user_prompt=user_prompt
        )

    async def optimize(self, req: AgentOptimizeRequest) -> str:
        user_prompt = PromptTemplate.AGENT_OPTIMIZE_USER.value.format(
            content=req.content,
            instruction=req.instruction or '无特殊要求，请全面优化'
        )
        return await self.llm.generate_text(
            system_prompt=PromptTemplate.AGENT_OPTIMIZE_SYSTEM.value,
            user_prompt=user_prompt
        )

    async def format(self, req: AgentFormatRequest) -> str:
        # 1. 获取标准配置
        std = self.FORMAT_STANDARDS.get(req.style)
        if not std:
            std = self.FORMAT_STANDARDS["公文 (Official Red-Head Doc)"]

        # 2. 构造 System Prompt
        system_prompt = PromptTemplate.AGENT_FORMAT_SYSTEM.value.format(
            style_name=req.style,
            style_desc=std['description'],
            css_req=std['css_requirements'],
            prompt_suffix=std['prompt_suffix']
        )
        user_prompt = PromptTemplate.AGENT_FORMAT_USER.value.format(content=req.content)
        
        # 3. 调用 LLM
        content = await self.llm.generate_text(system_prompt, user_prompt, temperature=0.1)
        
        # 4. 清理输出
        content = content.replace("```html", "").replace("```", "").strip()
        return content

    async def learn_formatting_rules(self, file: UploadFile) -> StyleLearnResponse:
        """
        [新功能] 学习参考文档格式
        """
        style_desc = await file_converter.analyze_document_style(file)
        return StyleLearnResponse(
            style_description=style_desc,
            preview_html=None
        )

    async def proofread(self, req: AgentProofreadRequest) -> List[ProofreadSuggestion]:
        reference_context = req.reference_style if req.reference_style else "通用公文写作规范"
        custom_instr = req.custom_instruction if req.custom_instruction else "无"

        user_prompt = PromptTemplate.AGENT_PROOFREAD_USER.value.format(
            reference=reference_context,
            instruction=custom_instr,
            content=req.content
        )
        
        # 调用 JSON 生成模式
        data = await self.llm.generate_json(
            system_prompt=PromptTemplate.AGENT_PROOFREAD_SYSTEM.value,
            user_prompt=user_prompt
        )
        
        suggestions_data = data.get("suggestions", [])
        return [ProofreadSuggestion(**item) for item in suggestions_data]

    async def export_document(self, req: AgentExportRequest) -> AgentExportResponse:
        try:
            output_bytes = b""
            mime_type = ""
            ext = ""

            if req.format == 'pdf':
                output_bytes = file_converter.html_to_pdf(req.html_content)
                mime_type = "application/pdf"
                ext = "pdf"
            elif req.format == 'docx':
                docx_io = file_converter.html_to_docx(req.html_content)
                output_bytes = docx_io.read()
                mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ext = "docx"
            else:
                raise ValueError("Unsupported format")

            b64_data = base64.b64encode(output_bytes).decode('utf-8')
            data_url = f"data:{mime_type};base64,{b64_data}"
            
            return AgentExportResponse(
                download_url=data_url,
                file_type=ext
            )
        except Exception as e:
            logger.error(f"Export failed: {e}")
            raise ValueError(f"导出失败: {str(e)}")

agent_service = AgentService()
