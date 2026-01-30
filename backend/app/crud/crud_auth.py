
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete
from app.models.auth import User, RegistrationRequest
from app.core.security import verify_password, get_password_hash
from app.schemas.auth import RegisterRequest

class CRUDAuth:
    """
    封装 Auth 相关的数据库操作
    """

    async def get_user_by_username(self, db: AsyncSession, username: str) -> Optional[User]:
        """
        根据用户名查询用户
        """
        stmt = select(User).where(User.username == username)
        result = await db.execute(stmt)
        return result.scalars().first()
    
    async def get_user(self, db: AsyncSession, user_id: UUID) -> Optional[User]:
        """
        根据 ID 查询用户
        """
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def get_users(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[User]:
        """
        获取用户列表 (分页)
        """
        stmt = select(User).order_by(desc(User.created_at)).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def create_user_direct(self, db: AsyncSession, obj_in: Dict[str, Any]) -> User:
        """
        管理员直接创建用户
        """
        db_obj = User(
            username=obj_in["username"],
            password_hash=obj_in["password_hash"],
            full_name=obj_in.get("full_name"),
            department_id=obj_in.get("department_id"),
            role_id=obj_in.get("role_id"),
            clearance_level=obj_in.get("clearance_level", 1),
            status=obj_in.get("status", "ACTIVE")
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_user(self, db: AsyncSession, user_id: UUID, update_data: Dict[str, Any]) -> Optional[User]:
        """
        更新用户信息
        """
        # 构造 update 语句
        stmt = update(User).where(User.id == user_id).values(**update_data).returning(User)
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first()

    async def delete_user(self, db: AsyncSession, user_id: UUID):
        """
        删除用户
        """
        stmt = delete(User).where(User.id == user_id)
        await db.execute(stmt)
        await db.commit()

    async def authenticate(self, db: AsyncSession, username: str, password: str) -> Optional[User]:
        """
        用户认证逻辑
        """
        user = await self.get_user_by_username(db, username)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    async def create_registration_request(
        self, db: AsyncSession, req_in: RegisterRequest, payload_dict: dict
    ) -> RegistrationRequest:
        """
        创建注册申请记录
        """
        db_obj = RegistrationRequest(
            payload=payload_dict,
            justification=req_in.justification,
            status="PENDING"
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_pending_requests(self, db: AsyncSession) -> List[RegistrationRequest]:
        """
        获取所有状态为 PENDING 的注册申请
        """
        stmt = select(RegistrationRequest).where(
            RegistrationRequest.status == "PENDING"
        ).order_by(desc(RegistrationRequest.request_date))
        
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_request(self, db: AsyncSession, req_id: UUID) -> Optional[RegistrationRequest]:
        """
        获取单个申请记录
        """
        stmt = select(RegistrationRequest).where(RegistrationRequest.id == req_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def create_user_from_request(self, db: AsyncSession, request: RegistrationRequest) -> User:
        """
        [核心逻辑] 批准申请：从 Request Payload 中提取数据创建 User
        """
        data = request.payload
        
        # 转换 UUID 字符串为对象 (如果 payload 中存的是 str)
        dept_id = UUID(data["department_id"]) if data.get("department_id") else None
        
        new_user = User(
            username=data["username"],
            password_hash=data["password_hash"], # 已经是哈希过的
            full_name=data.get("full_name"),
            department_id=dept_id,
            role_id=None, # 初始角色为空，或根据业务逻辑赋予默认角色
            clearance_level=data.get("clearance_level", 1),
            status="ACTIVE"
        )
        db.add(new_user)
        # 不 commit，由 Service 层统一 commit 以保证事务原子性
        return new_user

auth_crud = CRUDAuth()
