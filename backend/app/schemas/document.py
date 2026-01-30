
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from typing import Optional, List, Any, Dict
from datetime import datetime

# --- Knowledge Base Schemas ---

class ACLBase(BaseModel):
    subject_type: str # DEPT, ROLE, USER
    subject_id: UUID
    permission: str = 'READ'

class KBCreate(BaseModel):
    name: str
    description: Optional[str] = None
    clearance: str # 前端传 "机密" 等字符串
    authorized_departments: List[UUID] = []
    authorized_roles: List[UUID] = []
    authorized_users: List[UUID] = []

class KBUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    clearance: Optional[str] = None
    # 简化的全量更新 ACL 列表
    authorized_departments: Optional[List[UUID]] = None
    authorized_roles: Optional[List[UUID]] = None
    authorized_users: Optional[List[UUID]] = None

class KBResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    clearance: str # 返回映射后的字符串
    owner_id: UUID
    created_at: datetime
    # 仅返回 ID 列表，简化前端处理
    authorized_departments: List[UUID]
    authorized_roles: List[UUID]
    authorized_users: List[UUID]
    
    model_config = ConfigDict(from_attributes=True)

# --- Document Schemas ---

class DocumentResponse(BaseModel):
    id: UUID
    kb_id: UUID
    title: str
    type: Optional[str] = "FILE" # Derived from mime_type
    clearance: str
    last_updated: datetime = Field(alias="created_at")
    content_preview: Optional[str] = None
    status: str
    
    model_config = ConfigDict(from_attributes=True)

class DocumentDetail(DocumentResponse):
    """
    文档详情，包含元数据
    """
    file_size: Optional[int]
    page_count: Optional[int]
    meta: Optional[Dict[str, Any]]
    s3_key: str # 仅供后端调试或特定权限查看

class DesensitizeResponse(BaseModel):
    url: str # 临时下载链接

class PrintRequest(BaseModel):
    doc_id: UUID
    reason: str
    copies: int = 1

class PrintResponse(BaseModel):
    applicationId: str
