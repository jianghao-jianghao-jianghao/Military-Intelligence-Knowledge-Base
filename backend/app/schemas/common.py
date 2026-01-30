
from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    """
    统一 API 响应结构
    遵循 api_docs.md 定义
    """
    code: int = 200
    message: str = "OK"
    data: Optional[T] = None
    timestamp: Optional[str] = None
    trace_id: Optional[str] = None
