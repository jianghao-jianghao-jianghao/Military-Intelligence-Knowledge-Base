
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

# --- Registration / Audit Schemas ---

class RegistrationRequestResponse(BaseModel):
    """
    注册申请详情响应
    """
    id: UUID
    fullName: str = Field(validation_alias="full_name") # 映射逻辑: DB payload key -> Schema field
    username: str
    departmentId: str
    intendedClearance: str
    justification: Optional[str]
    status: str
    requestDate: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_payload(cls, obj):
        """
        辅助方法：从 ORM 对象及其 payload JSON 字段构造响应
        """
        payload = obj.payload
        # 将 payload 中的字段映射到 Schema
        return cls(
            id=obj.id,
            fullName=payload.get("full_name", ""),
            username=payload.get("username", ""),
            departmentId=payload.get("department_id", ""),
            intendedClearance=cls._map_clearance(payload.get("clearance_level", 1)),
            justification=obj.justification,
            status=obj.status,
            requestDate=obj.request_date
        )

    @staticmethod
    def _map_clearance(level: int) -> str:
        mapping = {0: "非涉密", 1: "内部公开", 2: "秘密", 3: "机密"}
        return mapping.get(level, "内部公开")


# --- User Governance Schemas ---

class AdminUserCreate(BaseModel):
    """
    管理员创建用户请求
    """
    name: str
    username: str
    departmentId: UUID
    roleId: UUID
    clearance: str # "机密", "内部" 等字符串
    status: str = "ACTIVE"
    password: Optional[str] = None # 可选，若不填则生成默认密码

class AdminUserUpdate(BaseModel):
    """
    管理员更新用户请求
    """
    name: Optional[str] = None
    departmentId: Optional[UUID] = None
    roleId: Optional[UUID] = None
    clearance: Optional[str] = None
    status: Optional[str] = None

class AdminUserResponse(BaseModel):
    id: UUID
    name: str = Field(validation_alias="full_name")
    username: str
    departmentId: Optional[UUID] = Field(validation_alias="department_id")
    roleId: Optional[UUID] = Field(validation_alias="role_id")
    clearance: str # 返回字符串
    status: str
    lastLogin: Optional[datetime] = Field(validation_alias="last_login_at")
    
    model_config = ConfigDict(from_attributes=True)


# --- FAQ Governance Schemas ---

class FAQCreate(BaseModel):
    question: str
    answer: str
    category: str
    clearance: str 

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    clearance: Optional[str] = None
    status: Optional[str] = None

class FAQResponse(BaseModel):
    id: UUID
    question: str
    answer: str
    category: Optional[str]
    status: str
    clearance: str 
    lastUpdated: datetime

    model_config = ConfigDict(from_attributes=True)

# --- DLP Policy Schemas ---

class PolicyCreate(BaseModel):
    word: str
    replacement: str
    severity: str 
    is_active: bool = True

class PolicyUpdate(BaseModel):
    word: Optional[str] = None
    replacement: Optional[str] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None

class PolicyResponse(BaseModel):
    id: UUID
    word: str = Field(serialization_alias="pattern") 
    replacement: str
    severity: str
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

# --- Search Strategy Config Schemas ---

class RetrievalTiers(BaseModel):
    """
    召回源配置
    """
    faq: bool = True
    graph: bool = True
    docs: bool = True
    llm: bool = True

class RetrievalEnhanced(BaseModel):
    """
    增强策略配置
    """
    queryRewrite: bool = True
    hyde: bool = False
    stepback: bool = True

class RetrievalParameters(BaseModel):
    """
    数值参数
    """
    topK: int = 5
    threshold: float = 0.75

class GlobalSearchConfig(BaseModel):
    """
    全局检索策略配置实体
    """
    strategy: str = "hybrid" # hybrid, vector, keyword
    tiers: RetrievalTiers
    enhanced: RetrievalEnhanced
    parameters: RetrievalParameters

class SearchConfigResponse(BaseModel):
    """
    响应包装，通常直接返回 config 对象，这里为了扩展性保留包装
    """
    config: GlobalSearchConfig

class UpdateSearchConfigRequest(BaseModel):
    config: GlobalSearchConfig

# --- Audit Log Schemas ---

class AuditLogResponse(BaseModel):
    """
    审计日志响应
    """
    id: int
    timestamp: datetime = Field(validation_alias="created_at")
    userId: Optional[UUID] = Field(validation_alias="user_id")
    userName: Optional[str] = Field(validation_alias="user_name")
    action: str
    resource: Optional[str] = Field(validation_alias="resource_target")
    status: str # "SUCCESS" or "DENIED" derived from int
    ip_address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @staticmethod
    def map_status(status_int: int) -> str:
        if status_int == 1:
            return "SUCCESS"
        elif status_int == 0:
            return "DENIED"
        else:
            return "WARNING"

class AuditExportRequest(BaseModel):
    """
    导出审计日志请求
    """
    format: Literal['pdf', 'csv', 'xlsx']
    query: Dict[str, Any] = {} # 传递筛选条件，如 limit, start_date 等

class AuditExportResponse(BaseModel):
    url: str # 导出文件的下载链接

# --- System Health Schemas ---

class ComponentStatus(BaseModel):
    name: str
    status: Literal['healthy', 'degraded', 'down']
    latency_ms: float
    details: Optional[str] = None

class SystemHealthResponse(BaseModel):
    overall: Literal['healthy', 'degraded', 'down']
    components: List[ComponentStatus]
    timestamp: datetime
