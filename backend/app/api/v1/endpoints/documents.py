
from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, File, status, BackgroundTasks
from typing import Any, List
from uuid import UUID

from app.api.deps import SessionDep, CurrentUser
from app.schemas.common import ApiResponse
from app.schemas.document import (
    KBResponse, DocumentResponse, DocumentDetail, 
    PrintRequest, PrintResponse, DesensitizeResponse
)
from app.services.document_service import doc_service
from app.services.ingestion_service import ingestion_service
from app.crud.crud_document import document_crud

router = APIRouter()

@router.get("/kbs", response_model=ApiResponse[List[KBResponse]])
async def get_authorized_kbs(
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    获取当前用户有权访问的知识库列表
    """
    kbs = await doc_service.list_authorized_kbs(db, current_user)
    return ApiResponse(data=kbs)

@router.get("/kbs/{kb_id}/files", response_model=ApiResponse[List[DocumentResponse]])
async def get_kb_files(
    kb_id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    获取指定库内的文档列表
    """
    # 1. 鉴权
    kb = await document_crud.get_kb(db, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge Base not found")
        
    if kb.base_clearance > current_user.clearance_level:
        raise HTTPException(status_code=403, detail="Insufficient clearance")

    # 2. 查询文档
    docs = await document_crud.get_documents_by_kb(db, kb_id, current_user.clearance_level)
    
    # 3. 转换响应
    resp_docs = []
    mapping = {0:"非涉密", 1:"内部公开", 2:"秘密", 3:"机密"}
    for d in docs:
        resp_docs.append(DocumentResponse(
            id=d.id,
            kb_id=d.kb_id,
            title=d.title,
            type="FILE",
            clearance=mapping.get(d.clearance, "内部"),
            created_at=d.created_at,
            status=d.status
        ))
        
    return ApiResponse(data=resp_docs)

@router.post("/upload", response_model=ApiResponse[bool])
async def upload_document(
    background_tasks: BackgroundTasks,
    db: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    kbId: str = Form(...),
    clearance: str = Form(...), # "机密", "内部"
) -> Any:
    """
    上传文档入库 (异步处理)
    """
    try:
        kb_uuid = UUID(kbId)
        
        # 1. 读取文件内容到内存 (注意：大文件应使用流式处理，此处为 Demo 简化)
        content_bytes = await file.read()
        # 重置指针以便后续可能的操作
        await file.seek(0)
        
        # 2. 创建数据库记录 (Status: INDEXING)
        doc = await doc_service.upload_document(db, file, kb_uuid, clearance, current_user)
        
        # 3. 添加后台任务：解析、切片、向量化
        # 注意：传递 content_bytes 而不是 file 对象，因为 file 对象在请求结束时会关闭
        background_tasks.add_task(
            ingestion_service.process_document_task, 
            doc_id=doc.id, 
            file_content=content_bytes, 
            filename=file.filename
        )
        
        return ApiResponse(data=True, message="Upload successful, indexing started in background.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{doc_id}", response_model=ApiResponse[DocumentDetail])
async def get_document_detail(
    doc_id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    获取文档详情
    """
    doc = await document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.clearance > current_user.clearance_level:
        raise HTTPException(status_code=403, detail="Insufficient clearance for this document")

    mapping = {0:"非涉密", 1:"内部公开", 2:"秘密", 3:"机密"}
    
    # 模拟预览内容
    preview = f"This is a preview of {doc.title}...\n[Security Classification: {mapping.get(doc.clearance)}]"

    detail = DocumentDetail(
        id=doc.id,
        kb_id=doc.kb_id,
        title=doc.title,
        type="FILE",
        clearance=mapping.get(doc.clearance, "内部"),
        created_at=doc.created_at,
        status=doc.status,
        file_size=doc.file_size,
        page_count=doc.page_count,
        content_preview=preview,
        s3_key=doc.s3_key,
        meta=doc.meta
    )
    return ApiResponse(data=detail)

@router.get("/{doc_id}/desensitize", response_model=ApiResponse[DesensitizeResponse])
async def download_desensitized(
    doc_id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    下载脱敏副本
    """
    try:
        res = await doc_service.generate_desensitized_url(db, doc_id, current_user)
        return ApiResponse(data=res)
    except ValueError:
        raise HTTPException(status_code=404, detail="Document not found")

@router.post("/{doc_id}/print", response_model=ApiResponse[PrintResponse])
async def apply_print(
    doc_id: UUID,
    req: PrintRequest,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    申请打印
    """
    res = await doc_service.apply_print(db, doc_id, req.reason, current_user)
    return ApiResponse(data=res)
