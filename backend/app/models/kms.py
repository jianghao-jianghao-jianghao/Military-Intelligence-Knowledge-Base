
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Boolean, text, SmallInteger, DateTime, BigInteger
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.db.base import Base

# --- KMS SCHEMA ---

class KnowledgeBase(Base):
    """
    知识库元数据表 (kms.knowledge_bases)
    用于逻辑隔离不同领域的文档集合，并作为权限挂载点。
    """
    __tablename__ = "knowledge_bases"
    __table_args__ = {"schema": "kms"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(text("TEXT"))
    
    # 库基准密级 (0:非密, 1:内部, 2:秘密, 3:机密)
    # 只有用户密级 >= 库密级 且 在 ACL 名单中 才能访问
    base_clearance: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("auth.users.id"))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    settings: Mapped[dict | None] = mapped_column(JSONB) # 存储解析配置、索引策略等
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 关系
    documents: Mapped[list["Document"]] = relationship(back_populates="kb", cascade="all, delete-orphan")
    acls: Mapped[list["KbACL"]] = relationship(back_populates="kb", cascade="all, delete-orphan")


class KbACL(Base):
    """
    知识库访问控制表 (kms.kb_acl)
    定义哪些 部门/角色/用户 有权访问该知识库
    """
    __tablename__ = "kb_acl"
    __table_args__ = {"schema": "kms"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    kb_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kms.knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    
    # Subject Type: 'DEPT', 'ROLE', 'USER'
    subject_type: Mapped[str] = mapped_column(String(10), nullable=False)
    # 对应的 ID (部门ID / 角色ID / 用户ID)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    
    # Permission: 'READ', 'WRITE', 'MANAGER'
    permission: Mapped[str] = mapped_column(String(20), default='READ')

    # 关系
    kb: Mapped["KnowledgeBase"] = relationship(back_populates="acls")


class Document(Base):
    """
    文档索引表 (kms.documents)
    存储文件元数据，实际文件内容存储在 MinIO/S3
    """
    __tablename__ = "documents"
    __table_args__ = {"schema": "kms"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    kb_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kms.knowledge_bases.id"), nullable=False)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_hash: Mapped[str | None] = mapped_column(String(64), index=True) # SHA-256 用于去重
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False) # 对象存储路径
    
    file_size: Mapped[int | None] = mapped_column(BigInteger)
    mime_type: Mapped[str | None] = mapped_column(String(50))
    page_count: Mapped[int | None] = mapped_column(Integer)
    
    # 文档级密级 (需 >= KB 密级)
    clearance: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    
    # 状态: 'INDEXING', 'READY', 'FAILED'
    status: Mapped[str] = mapped_column(String(20), default='INDEXING')
    
    # 扩展元数据 (作者, 发布年份, 型号标签等)
    meta: Mapped[dict | None] = mapped_column(JSONB)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 关系
    kb: Mapped["KnowledgeBase"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """
    文档切片表 (kms.document_chunks)
    存储用于 RAG 检索的文本片段及其向量 Embedding
    """
    __tablename__ = "document_chunks"
    __table_args__ = {"schema": "kms"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    doc_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kms.documents.id", ondelete="CASCADE"), nullable=False)
    
    # 冗余字段，用于快速按库过滤向量 (Partition Key)
    kb_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    content: Mapped[str] = mapped_column(text("TEXT"), nullable=False)
    
    # 向量字段 (1536 维适配 OpenAI/bge-m3)
    embedding = mapped_column(Vector(1536))
    
    page_idx: Mapped[int | None] = mapped_column(Integer)
    chunk_idx: Mapped[int | None] = mapped_column(Integer)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 关系
    document: Mapped["Document"] = relationship(back_populates="chunks")
