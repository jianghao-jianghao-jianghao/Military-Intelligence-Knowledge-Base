
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc
from sqlalchemy.dialects.postgresql import insert
from app.models.gov import FAQ, DLPPolicy, SystemConfig, AuditLog
from app.schemas.admin import FAQCreate, FAQUpdate, PolicyCreate, PolicyUpdate

class CRUDGov:
    """
    治理模块 (Governance) 数据库操作
    """

    # --- FAQ Operations ---

    async def get_faqs(
        self, db: AsyncSession, status: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[FAQ]:
        """
        获取 FAQ 列表，可按状态筛选 (例如只获取 PENDING)
        """
        stmt = select(FAQ).order_by(desc(FAQ.last_updated)).offset(skip).limit(limit)
        if status:
            stmt = stmt.where(FAQ.status == status)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_faq(self, db: AsyncSession, faq_id: UUID) -> Optional[FAQ]:
        stmt = select(FAQ).where(FAQ.id == faq_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def create_faq(self, db: AsyncSession, obj_in: FAQCreate, status: str = "APPROVED") -> FAQ:
        """
        创建 FAQ (手动录入通常直接 Approved)
        """
        # 密级映射
        c_map = {"非涉密": 0, "内部公开": 1, "秘密": 2, "机密": 3}
        c_val = c_map.get(obj_in.clearance, 1)

        db_obj = FAQ(
            question=obj_in.question,
            answer=obj_in.answer,
            category=obj_in.category,
            clearance=c_val,
            status=status
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_faq(self, db: AsyncSession, db_obj: FAQ, obj_in: FAQUpdate) -> FAQ:
        """
        更新 FAQ
        """
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # 处理密级转换
        if "clearance" in update_data:
            c_map = {"非涉密": 0, "内部公开": 1, "秘密": 2, "机密": 3}
            update_data["clearance"] = c_map.get(update_data["clearance"], 1)

        for field, value in update_data.items():
            setattr(db_obj, field, value)

        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete_faq(self, db: AsyncSession, faq_id: UUID):
        stmt = delete(FAQ).where(FAQ.id == faq_id)
        await db.execute(stmt)
        await db.commit()

    # --- DLP Policy Operations ---

    async def get_policies(self, db: AsyncSession) -> List[DLPPolicy]:
        stmt = select(DLPPolicy).order_by(desc(DLPPolicy.created_at))
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    async def get_policy(self, db: AsyncSession, policy_id: UUID) -> Optional[DLPPolicy]:
        stmt = select(DLPPolicy).where(DLPPolicy.id == policy_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def create_policy(self, db: AsyncSession, obj_in: PolicyCreate) -> DLPPolicy:
        db_obj = DLPPolicy(
            pattern=obj_in.word,
            replacement=obj_in.replacement,
            severity=obj_in.severity,
            is_active=obj_in.is_active,
            action="MASK" # 默认动作
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_policy(self, db: AsyncSession, db_obj: DLPPolicy, obj_in: PolicyUpdate) -> DLPPolicy:
        if obj_in.word is not None:
            db_obj.pattern = obj_in.word
        if obj_in.replacement is not None:
            db_obj.replacement = obj_in.replacement
        if obj_in.severity is not None:
            db_obj.severity = obj_in.severity
        if obj_in.is_active is not None:
            db_obj.is_active = obj_in.is_active
            
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete_policy(self, db: AsyncSession, policy_id: UUID):
        stmt = delete(DLPPolicy).where(DLPPolicy.id == policy_id)
        await db.execute(stmt)
        await db.commit()

    # --- System Config Operations ---

    async def get_system_config(self, db: AsyncSession, key: str) -> Optional[Dict[str, Any]]:
        """
        获取系统配置 JSON
        """
        stmt = select(SystemConfig).where(SystemConfig.key == key)
        result = await db.execute(stmt)
        config = result.scalars().first()
        return config.value if config else None

    async def upsert_system_config(self, db: AsyncSession, key: str, value: Dict[str, Any], description: str = None) -> Dict[str, Any]:
        """
        更新或插入系统配置 (Upsert)
        """
        stmt = insert(SystemConfig).values(
            key=key, 
            value=value, 
            description=description
        ).on_conflict_do_update(
            index_elements=['key'],
            set_=dict(value=value, updated_at=func.now())
        ).returning(SystemConfig)
        
        result = await db.execute(stmt)
        await db.commit()
        obj = result.scalars().first()
        return obj.value

    # --- Audit Log Operations (New) ---

    async def get_audit_logs(
        self, db: AsyncSession, skip: int = 0, limit: int = 50, user_id: Optional[UUID] = None
    ) -> List[AuditLog]:
        """
        获取审计日志，支持简单过滤
        """
        stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
        
        if user_id:
            stmt = stmt.where(AuditLog.user_id == user_id)
            
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def create_audit_log(self, db: AsyncSession, log_entry: dict) -> AuditLog:
        """
        写入审计日志（通常由中间件或 Service 调用）
        """
        db_obj = AuditLog(**log_entry)
        db.add(db_obj)
        await db.commit()
        return db_obj

gov_crud = CRUDGov()
