
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, JSON, text, SmallInteger, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base

# --- AUTH SCHEMA ---

class Department(Base):
    """
    组织架构表 (auth.departments)
    支持层级结构 (Tree)
    """
    __tablename__ = "departments"
    __table_args__ = {"schema": "auth"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("auth.departments.id"), nullable=True)
    # path (LTREE) 暂用 String 模拟，复杂场景需引入 SQLAlchemy-Utils 的 Ltree 类型
    # path: Mapped[str] = mapped_column(String, nullable=True) 
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 关系定义
    users: Mapped[list["User"]] = relationship(back_populates="department")
    sub_departments: Mapped[list["Department"]] = relationship("Department", backref=relationship("Department", remote_side=[id]))


class Role(Base):
    """
    角色表 (auth.roles)
    """
    __tablename__ = "roles"
    __table_args__ = {"schema": "auth"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    permissions: Mapped[dict] = mapped_column(JSONB, server_default=text("'[]'"), nullable=False)

    # 关系定义
    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(Base):
    """
    用户表 (auth.users)
    """
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100))
    
    department_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("auth.departments.id"))
    role_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("auth.roles.id"))
    
    # 0:非密, 1:内部, 2:秘密, 3:机密
    clearance_level: Mapped[int] = mapped_column(SmallInteger, default=0) 
    
    # ACTIVE, LOCKED, INACTIVE
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 关系定义
    department: Mapped["Department"] = relationship(back_populates="users")
    role: Mapped["Role"] = relationship(back_populates="users")


class RegistrationRequest(Base):
    """
    注册申请暂存表 (auth.registration_requests)
    """
    __tablename__ = "registration_requests"
    __table_args__ = {"schema": "auth"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False) # 存储拟注册的完整用户信息
    # PENDING, APPROVED, REJECTED
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    
    auditor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("auth.users.id"))
    justification: Mapped[str | None] = mapped_column(text("TEXT"))
    request_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
