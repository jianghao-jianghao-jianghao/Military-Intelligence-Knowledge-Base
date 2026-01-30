
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from typing import Optional, List, Any
from datetime import datetime

# --- Enums & Helpers ---

class MessageRole:
    USER = "user"
    ASSISTANT = "assistant"

class SecurityBadge:
    UNCLASSIFIED = "非涉密"
    INTERNAL = "内部公开"
    SECRET = "机密"

# --- Retrieval Configuration ---

class RetrievalTiers(BaseModel):
    faq: bool = True
    graph: bool = True
    docs: bool = True
    llm: bool = True

class RetrievalEnhanced(BaseModel):
    queryRewrite: bool = True
    hyde: bool = False # 假设文档嵌入
    stepback: bool = False # 抽象回退策略

class ChatConfig(BaseModel):
    """
    单次对话的检索策略配置
    """
    selected_kb_ids: List[UUID]
    strategy: str = "hybrid" # hybrid, vector, keyword
    tiers: RetrievalTiers
    enhanced: RetrievalEnhanced

# --- Core Chat Objects ---

class Provenance(BaseModel):
    """
    引用源证据
    """
    sentence_id: str
    source_type: str # DOCS, KG, FAQ
    source_name: str
    doc_id: Optional[UUID] = None
    text: str
    score: float
    security_level: str
    start: Optional[int] = None
    end: Optional[int] = None

class ThoughtStep(BaseModel):
    """
    推理思维链步骤
    """
    title: str
    content: str
    type: str # search, reason, verify, etc.

class QAResponse(BaseModel):
    """
    RAG 问答响应体 (对应 frontend QAResponse)
    """
    id: UUID
    conversation_id: UUID
    answer: str
    confidence: float
    security_badge: str
    is_desensitized: bool
    thought_process: List[ThoughtStep]
    provenance: List[Provenance]
    timestamp: datetime

# --- API Request/Response DTOs ---

class ChatMessageCreate(BaseModel):
    """
    用户发送消息请求
    """
    query: str
    config: Optional[ChatConfig] = None
    quote: Optional[str] = None # 针对特定上下文的追问

class SessionCreate(BaseModel):
    title: Optional[str] = None
    bound_kb_ids: List[UUID]

class SessionUpdate(BaseModel):
    title: str

class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    timestamp: datetime
    # 仅 Assistant 消息包含详细 RAG 信息
    qaResponse: Optional[QAResponse] = None 
    
    model_config = ConfigDict(from_attributes=True)

class SessionResponse(BaseModel):
    id: UUID
    title: str
    bound_kb_ids: List[UUID]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class FeedbackCreate(BaseModel):
    conversation_id: UUID
    question: str
    answer: str
    score: int = 1
    comment: Optional[str] = None
