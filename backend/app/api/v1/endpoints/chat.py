
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, List
from uuid import UUID

from app.api.deps import SessionDep, CurrentUser
from app.schemas.common import ApiResponse
from app.schemas.chat import (
    SessionCreate, SessionUpdate, SessionResponse, 
    ChatMessageCreate, MessageResponse, QAResponse,
    FeedbackCreate
)
from app.crud.crud_chat import chat_crud
from app.services.rag_engine import rag_engine

router = APIRouter()

@router.get("/sessions", response_model=ApiResponse[List[SessionResponse]])
async def get_sessions(
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50
) -> Any:
    """
    获取当前用户的会话列表
    """
    sessions = await chat_crud.get_user_sessions(db, current_user.id, skip, limit)
    return ApiResponse(data=sessions)

@router.post("/sessions", response_model=ApiResponse[SessionResponse])
async def create_session(
    session_in: SessionCreate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    创建新会话
    """
    session = await chat_crud.create_session(db, session_in, current_user.id)
    return ApiResponse(data=session)

@router.patch("/sessions/{session_id}", response_model=ApiResponse[SessionResponse])
async def update_session(
    session_id: UUID,
    session_in: SessionUpdate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    更新会话 (如重命名)
    """
    # 鉴权
    session = await chat_crud.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    updated_session = await chat_crud.update_session(db, session_id, session_in)
    return ApiResponse(data=updated_session)

@router.delete("/sessions/{session_id}", response_model=ApiResponse[bool])
async def delete_session(
    session_id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    删除会话
    """
    session = await chat_crud.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await chat_crud.delete_session(db, session_id, current_user.id)
    return ApiResponse(data=True)

@router.get("/sessions/{session_id}/messages", response_model=ApiResponse[List[MessageResponse]])
async def get_messages(
    session_id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    获取指定会话的历史消息记录
    """
    # 鉴权
    session = await chat_crud.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = await chat_crud.get_messages(db, session_id)
    
    # 将 ORM 对象转换为 Pydantic 响应模型
    # 特别处理 assistant 消息的 qaResponse 构造
    result_msgs = []
    for m in messages:
        qa_resp = None
        if m.role == "assistant" and m.thought_chain:
            # 尝试从存储的 JSON 重构 QAResponse 结构
            # 注意：实际生产中建议存储完整的 QAResponse JSON 或按需拼装
            qa_resp = QAResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                answer=m.content,
                confidence=0.9, # 历史数据可能缺失，给默认值
                security_badge="内部",
                is_desensitized=True,
                thought_process=m.thought_chain or [],
                provenance=m.citations or [],
                timestamp=m.created_at
            )
        
        result_msgs.append(MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            timestamp=m.created_at,
            qaResponse=qa_resp
        ))
        
    return ApiResponse(data=result_msgs)

@router.post("/sessions/{session_id}/messages", response_model=ApiResponse[QAResponse])
async def send_message(
    session_id: UUID,
    msg_in: ChatMessageCreate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    核心问答接口：发送消息并获取 RAG 响应
    """
    # 鉴权
    session = await chat_crud.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # 委托给 RAG 引擎处理
    # 引擎负责：保存用户消息 -> 执行检索 -> 执行生成 -> 保存 AI 消息 -> 返回结果
    response = await rag_engine.process_query(db, current_user, session_id, msg_in)
    
    return ApiResponse(data=response)

@router.post("/feedback/faq", response_model=ApiResponse[bool])
async def submit_faq_feedback(
    feedback: FeedbackCreate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    提交反馈至 FAQ 治理库 (回流机制)
    """
    # 实际逻辑应将数据写入 auth.faqs 暂存表或 chat.feedback 表
    # 这里仅做 Mock 实现
    return ApiResponse(data=True)
