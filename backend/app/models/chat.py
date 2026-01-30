
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, text, SmallInteger, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base

# --- CHAT SCHEMA ---

class Conversation(Base):
    """
    会话上下文表 (chat.conversations)
    存储对话的配置快照和绑定的知识库范围
    """
    __tablename__ = "conversations"
    __table_args__ = {"schema": "chat"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("auth.users.id"), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(200))
    
    # 绑定的知识库 ID 列表，用于界定检索范围 (PostgreSQL Array 类型)
    bound_kb_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)
    
    # 对话时的配置快照 (如 RAG 策略、Temperature 等)
    config_snapshot: Mapped[dict | None] = mapped_column(JSONB)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    """
    消息记录表 (chat.messages)
    记录用户提问和 AI 回答，包括推理过程(CoT)和引用源(Citations)
    """
    __tablename__ = "messages"
    __table_args__ = {"schema": "chat"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat.conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 'user' | 'assistant'
    role: Mapped[str] = mapped_column(String(10), nullable=False)
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # 核心：思维链，存储推理步骤 [{"title": "检索", "content": "..."}]
    thought_chain: Mapped[list[dict] | None] = mapped_column(JSONB)
    
    # 核心：引用源，存储 RAG 召回的切片 [{"doc_id": "...", "text": "..."}]
    citations: Mapped[list[dict] | None] = mapped_column(JSONB)
    
    tokens_usage: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 关系
    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    feedback: Mapped["Feedback"] = relationship(back_populates="message", uselist=False)


class Feedback(Base):
    """
    用户反馈表 (chat.feedback)
    用于 RLHF (人类反馈强化学习) 和 QA 质量治理
    """
    __tablename__ = "feedback"
    __table_args__ = {"schema": "chat"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat.messages.id"), nullable=False)
    
    # 1: 赞, 0: 无感, -1: 踩
    score: Mapped[int] = mapped_column(SmallInteger)
    comment: Mapped[str | None] = mapped_column(Text)
    
    # 是否已被管理员审阅
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 关系
    message: Mapped["Message"] = relationship(back_populates="feedback")
