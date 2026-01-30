
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Any, List
from app.api.deps import SessionDep, CurrentUser
from app.schemas.common import ApiResponse
from app.schemas.agent import (
    AgentWriteRequest, AgentOptimizeRequest, AgentFormatRequest, 
    AgentProofreadRequest, ProofreadSuggestion, AgentExportRequest, AgentExportResponse,
    StyleLearnResponse
)
from app.services.agent_service import agent_service
from app.utils.file_converter import file_converter

router = APIRouter()

@router.post("/write", response_model=ApiResponse[str])
async def agent_write(
    req: AgentWriteRequest,
    current_user: CurrentUser
) -> Any:
    """
    智能写作：根据主题和大纲生成文档初稿
    """
    try:
        content = await agent_service.write(req)
        return ApiResponse(data=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize", response_model=ApiResponse[str])
async def agent_optimize(
    req: AgentOptimizeRequest,
    current_user: CurrentUser
) -> Any:
    """
    文案优化：对现有文本进行润色和改写
    """
    try:
        content = await agent_service.optimize(req)
        return ApiResponse(data=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/format", response_model=ApiResponse[str])
async def agent_format(
    req: AgentFormatRequest,
    current_user: CurrentUser
) -> Any:
    """
    智能排版：将文本转换为标准公文格式 (HTML)
    """
    try:
        content = await agent_service.format(req)
        return ApiResponse(data=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/learn-style", response_model=ApiResponse[StyleLearnResponse])
async def agent_learn_style(
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> Any:
    """
    [新] 格式学习接口
    上传标准文档 (.docx/.dot)，返回解析出的格式规范描述 (Markdown)。
    """
    try:
        result = await agent_service.learn_formatting_rules(file)
        return ApiResponse(data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"格式学习失败: {str(e)}")

@router.post("/proofread", response_model=ApiResponse[List[ProofreadSuggestion]])
async def agent_proofread(
    req: AgentProofreadRequest,
    current_user: CurrentUser
) -> Any:
    """
    智能校对：依据参考格式和内容进行比对，返回修改建议列表。
    """
    try:
        suggestions = await agent_service.proofread(req)
        return ApiResponse(data=suggestions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export", response_model=ApiResponse[AgentExportResponse])
async def agent_export(
    req: AgentExportRequest,
    current_user: CurrentUser
) -> Any:
    """
    导出文档
    """
    try:
        res = await agent_service.export_document(req)
        return ApiResponse(data=res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
