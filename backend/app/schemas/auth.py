
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, List
from datetime import datetime

# --- Enums / Constants (Mapping to types.ts) ---

class ClearanceLevel:
    UNCLASSIFIED = 0
    INTERNAL = 1
    CONFIDENTIAL = 2
    SECRET = 3

# --- Shared Properties ---

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    department_id: Optional[UUID] = None
    clearance_level: int = 0
    status: str = "ACTIVE"

# --- API DTOs ---

class LoginRequest(BaseModel):
    username: str
    secret: str # Password

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(UserBase):
    """
    返回给前端的用户信息，不包含密码哈希
    """
    id: UUID
    role_id: Optional[UUID] = None
    # Pydantic v2 配置: 允许从 ORM 对象读取数据
    model_config = ConfigDict(from_attributes=True)

class LoginResponse(BaseModel):
    token: str # api_docs.md 中定义为 token 字符串，非标准 OAuth2 JSON
    user: UserResponse

class RegisterRequest(BaseModel):
    """
    注册请求载荷
    """
    username: str
    password: str
    fullName: str
    departmentId: str # UUID string
    intendedClearance: str # 前端传字符串 "机密", 需转换映射
    justification: str

class RegistrationResponse(BaseModel):
    requestId: UUID
    status: str
