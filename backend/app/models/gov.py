
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, text, SmallInteger, DateTime, BigInteger
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.db.base import Base

# --- GOVERNANCE SCHEMA ---

class FAQ(Base):
    """
    标准问答库表 (gov.faqs)
    用于存储经过人工审核的标准问答对，支持向量检索。
    """
    __tablename__ = "faqs"
    __table_args__ = {"schema": "gov"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    
    question: Mapped[str] = mapped_column(text("TEXT"), nullable=False)
    answer: Mapped[str] = mapped_column(text("TEXT"), nullable=False)
    
    # 向量字段 (1536 维适配 OpenAI/bge-m3)
    # 只有 APPROVED 状态的 FAQ 才会生成并更新向量
    embedding = mapped_column(Vector(1536))
    
    category: Mapped[str | None] = mapped_column(String(50))
    
    # 状态: DRAFT(草稿), PENDING(待审), APPROVED(已发布), REJECTED(驳回)
    status: Mapped[str] = mapped_column(String(20), default='DRAFT')
    
    # 密级: 0-3
    clearance: Mapped[int] = mapped_column(SmallInteger, default=1)
    
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DLPPolicy(Base):
    """
    敏感词策略表 (gov.dlp_policies)
    用于定义数据防泄漏规则。
    """
    __tablename__ = "dlp_policies"
    __table_args__ = {"schema": "gov"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    pattern: Mapped[str] = mapped_column(String(100), nullable=False) # 敏感词或正则
    replacement: Mapped[str | None] = mapped_column(String(100)) # 替换字符
    
    # MASK (脱敏), BLOCK (拦截), ALERT (告警)
    action: Mapped[str] = mapped_column(String(20), default='MASK')
    
    # HIGH, MEDIUM, LOW
    severity: Mapped[str] = mapped_column(String(20), default='high')
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SystemConfig(Base):
    """
    系统全局配置表 (gov.system_configs)
    用于存储 Key-Value 类型的全局配置，例如 "search_config"。
    采用 JSONB 存储复杂配置结构，避免频繁变更表结构。
    """
    __tablename__ = "system_configs"
    __table_args__ = {"schema": "gov"}

    # 配置键 (如 'global_search_config')
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    
    # 配置值 (JSON)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    
    description: Mapped[str | None] = mapped_column(String(200))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    """
    审计日志表 (gov.audit_logs)
    记录所有关键的用户行为和系统事件。
    建议在生产环境中按月进行分区 (Range Partitioning)。
    """
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "gov"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    trace_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True)) # 分布式追踪 ID
    
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    user_name: Mapped[str | None] = mapped_column(String(100)) # 冗余存储，防止用户被删后无法追溯
    
    action: Mapped[str] = mapped_column(String(50), nullable=False) # LOGIN, VIEW_DOC, EXPORT
    resource_target: Mapped[str | None] = mapped_column(String(255)) # 目标资源标识 (e.g. Doc Title)
    
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(String(255))
    
    status: Mapped[int] = mapped_column(SmallInteger) # 1: Success, 0: Fail/Denied
    detail: Mapped[dict | None] = mapped_column(JSONB) # 失败原因或操作详情
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
