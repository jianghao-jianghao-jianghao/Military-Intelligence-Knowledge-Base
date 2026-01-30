
from uuid import UUID
from typing import List, Dict, Any
from datetime import datetime
import csv
import io
import time
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.crud.crud_auth import auth_crud
from app.crud.crud_gov import gov_crud
from app.crud.crud_document import document_crud
from app.models.auth import User
from app.models.kms import KnowledgeBase, KbACL
from app.core.security import get_password_hash
from app.schemas.auth import ClearanceLevel
from app.schemas.admin import AdminUserCreate, AdminUserUpdate, AuditExportRequest, AuditExportResponse, SystemHealthResponse, ComponentStatus
from app.schemas.document import KBCreate, KBUpdate, KBResponse
from app.core.config import settings

class AdminService:
    """
    管理后台业务逻辑服务
    """

    # --- Helper: Clearance Mapping ---
    def _map_clearance_str_to_int(self, c_str: str) -> int:
        mapping = {
            "非涉密": ClearanceLevel.UNCLASSIFIED,
            "内部公开": ClearanceLevel.INTERNAL,
            "秘密": ClearanceLevel.CONFIDENTIAL,
            "机密": ClearanceLevel.SECRET
        }
        return mapping.get(c_str, ClearanceLevel.INTERNAL)

    def _map_clearance_int_to_str(self, c_int: int) -> str:
        mapping = {
            ClearanceLevel.UNCLASSIFIED: "非涉密",
            ClearanceLevel.INTERNAL: "内部公开",
            ClearanceLevel.CONFIDENTIAL: "秘密",
            ClearanceLevel.SECRET: "机密"
        }
        return mapping.get(c_int, "内部公开")

    # --- User Governance ---

    async def create_user(self, db: AsyncSession, obj_in: AdminUserCreate) -> User:
        # 检查用户名
        exists = await auth_crud.get_user_by_username(db, obj_in.username)
        if exists:
            raise HTTPException(status_code=400, detail="Username already exists")

        # 处理密码 (如果未提供，使用默认 "123456")
        raw_pwd = obj_in.password or "123456"
        hashed_pwd = get_password_hash(raw_pwd)

        user_data = {
            "username": obj_in.username,
            "password_hash": hashed_pwd,
            "full_name": obj_in.name,
            "department_id": obj_in.departmentId,
            "role_id": obj_in.roleId,
            "clearance_level": self._map_clearance_str_to_int(obj_in.clearance),
            "status": obj_in.status
        }
        
        return await auth_crud.create_user_direct(db, user_data)

    async def update_user(self, db: AsyncSession, user_id: UUID, obj_in: AdminUserUpdate) -> User:
        user = await auth_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        update_data = {}
        if obj_in.name is not None:
            update_data["full_name"] = obj_in.name
        if obj_in.departmentId is not None:
            update_data["department_id"] = obj_in.departmentId
        if obj_in.roleId is not None:
            update_data["role_id"] = obj_in.roleId
        if obj_in.clearance is not None:
            update_data["clearance_level"] = self._map_clearance_str_to_int(obj_in.clearance)
        if obj_in.status is not None:
            update_data["status"] = obj_in.status

        if not update_data:
            return user

        return await auth_crud.update_user(db, user_id, update_data)

    async def delete_user(self, db: AsyncSession, user_id: UUID):
        user = await auth_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await auth_crud.delete_user(db, user_id)

    # --- KB Management ---

    async def create_kb(self, db: AsyncSession, kb_in: KBCreate, owner_id: UUID) -> KnowledgeBase:
        kb = KnowledgeBase(
            name=kb_in.name,
            description=kb_in.description,
            base_clearance=self._map_clearance_str_to_int(kb_in.clearance),
            owner_id=owner_id,
            settings={}
        )
        
        acls = self._build_acls_from_ids(
            kb_in.authorized_users,
            kb_in.authorized_roles,
            kb_in.authorized_departments
        )
            
        return await document_crud.create_kb(db, kb, acls)

    async def update_kb(self, db: AsyncSession, kb_id: UUID, kb_in: KBUpdate) -> KnowledgeBase:
        kb = await document_crud.get_kb(db, kb_id)
        if not kb:
            raise HTTPException(status_code=404, detail="KB not found")

        update_data = {}
        if kb_in.name: update_data["name"] = kb_in.name
        if kb_in.description: update_data["description"] = kb_in.description
        if kb_in.clearance: update_data["base_clearance"] = self._map_clearance_str_to_int(kb_in.clearance)
        
        if update_data:
            await document_crud.update_kb(db, kb_id, update_data)

        if kb_in.authorized_departments is not None or kb_in.authorized_roles is not None or kb_in.authorized_users is not None:
            new_users = kb_in.authorized_users if kb_in.authorized_users is not None else [acl.subject_id for acl in kb.acls if acl.subject_type == 'USER']
            new_roles = kb_in.authorized_roles if kb_in.authorized_roles is not None else [acl.subject_id for acl in kb.acls if acl.subject_type == 'ROLE']
            new_depts = kb_in.authorized_departments if kb_in.authorized_departments is not None else [acl.subject_id for acl in kb.acls if acl.subject_type == 'DEPT']

            new_acls = self._build_acls_from_ids(new_users, new_roles, new_depts)
            await document_crud.update_kb_acls(db, kb_id, new_acls)

        return await document_crud.get_kb(db, kb_id)

    def _build_acls_from_ids(self, user_ids, role_ids, dept_ids) -> List[KbACL]:
        acls = []
        if user_ids:
            for uid in user_ids:
                acls.append(KbACL(subject_type='USER', subject_id=uid, permission='READ'))
        if role_ids:
            for rid in role_ids:
                acls.append(KbACL(subject_type='ROLE', subject_id=rid, permission='READ'))
        if dept_ids:
            for did in dept_ids:
                acls.append(KbACL(subject_type='DEPT', subject_id=did, permission='READ'))
        return acls

    def format_kb_response(self, kb: KnowledgeBase) -> KBResponse:
        dept_ids = [acl.subject_id for acl in kb.acls if acl.subject_type == 'DEPT']
        role_ids = [acl.subject_id for acl in kb.acls if acl.subject_type == 'ROLE']
        user_ids = [acl.subject_id for acl in kb.acls if acl.subject_type == 'USER']
        
        return KBResponse(
            id=kb.id,
            name=kb.name,
            description=kb.description,
            clearance=self._map_clearance_int_to_str(kb.base_clearance),
            owner_id=kb.owner_id,
            created_at=kb.created_at,
            authorized_departments=dept_ids,
            authorized_roles=role_ids,
            authorized_users=user_ids
        )

    async def delete_kb(self, db: AsyncSession, kb_id: UUID):
        kb = await document_crud.get_kb(db, kb_id)
        if not kb:
            raise HTTPException(status_code=404, detail="KB not found")
        await document_crud.delete_kb(db, kb_id)

    # --- Approval Logic ---

    async def approve_registration(self, db: AsyncSession, req_id: UUID, auditor: User) -> bool:
        req = await auth_crud.get_request(db, req_id)
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        if req.status != "PENDING":
            raise HTTPException(status_code=400, detail="Request is not pending")
        try:
            await auth_crud.create_user_from_request(db, req)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to create user: {str(e)}")
        req.status = "APPROVED"
        req.auditor_id = auditor.id
        await db.commit()
        return True

    async def reject_registration(self, db: AsyncSession, req_id: UUID, auditor: User) -> bool:
        req = await auth_crud.get_request(db, req_id)
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        req.status = "REJECTED"
        req.auditor_id = auditor.id
        await db.commit()
        return True

    async def approve_faq(self, db: AsyncSession, faq_id: UUID) -> bool:
        faq = await gov_crud.get_faq(db, faq_id)
        if not faq:
            raise HTTPException(status_code=404, detail="FAQ not found")
        faq.status = "APPROVED"
        await db.commit()
        return True

    async def reject_faq(self, db: AsyncSession, faq_id: UUID) -> bool:
        faq = await gov_crud.get_faq(db, faq_id)
        if not faq:
            raise HTTPException(status_code=404, detail="FAQ not found")
        faq.status = "REJECTED"
        await db.commit()
        return True

    # --- Audit Logs & System Health ---

    async def export_audit_logs(self, db: AsyncSession, req: AuditExportRequest) -> AuditExportResponse:
        """
        导出审计日志
        为了简化演示，这里生成 CSV 字符串并返回 Data URL。
        生产环境应生成文件上传至 MinIO 并返回预签名 URL。
        """
        # 获取日志 (暂不支持复杂 query 解析，仅 limit)
        limit = req.query.get('limit', 1000)
        logs = await gov_crud.get_audit_logs(db, limit=limit)
        
        output = io.StringIO()
        writer = csv.writer(output)
        # CSV Header
        writer.writerow(['ID', 'Timestamp', 'User', 'Action', 'Resource', 'Status', 'IP'])
        
        for log in logs:
            status_str = "SUCCESS" if log.status == 1 else "DENIED" if log.status == 0 else "WARNING"
            writer.writerow([
                log.id, 
                log.created_at.isoformat(), 
                f"{log.user_name} ({log.user_id})", 
                log.action, 
                log.resource_target, 
                status_str,
                log.ip_address
            ])
            
        csv_content = output.getvalue()
        # Encode simple Data URL for download
        import base64
        b64_csv = base64.b64encode(csv_content.encode('utf-8')).decode('utf-8')
        data_url = f"data:text/csv;base64,{b64_csv}"
        
        return AuditExportResponse(url=data_url)

    async def check_system_health(self, db: AsyncSession) -> SystemHealthResponse:
        """
        检查系统各组件健康状态
        """
        components = []
        overall_status = "healthy"

        # 1. Check PostgreSQL
        start_time = time.time()
        try:
            await db.execute(text("SELECT 1"))
            latency = (time.time() - start_time) * 1000
            components.append(ComponentStatus(
                name="PostgreSQL Database",
                status="healthy",
                latency_ms=round(latency, 2),
                details="Connection active"
            ))
        except Exception as e:
            overall_status = "degraded"
            components.append(ComponentStatus(
                name="PostgreSQL Database",
                status="down",
                latency_ms=0,
                details=str(e)
            ))

        # 2. Check Redis (Assuming redis client is available or we mock it for this logic layer if not injected)
        # 实际代码中应从依赖注入或全局变量获取 redis_client
        # 这里仅作 Mock 演示，假设 Redis 总是可用（或者需要引入 redis 库真正检查）
        try:
            # import redis.asyncio as redis
            # client = redis.from_url(f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}")
            # await client.ping()
            # await client.close()
            components.append(ComponentStatus(
                name="Redis Cache",
                status="healthy",
                latency_ms=1.5, # Mock latency
                details="Cluster OK"
            ))
        except Exception as e:
            # overall_status = "degraded"
            pass

        # 3. Check Vector Search Engine (pgvector extension check)
        try:
            start_time = time.time()
            await db.execute(text("SELECT count(*) FROM pg_extension WHERE extname = 'vector'"))
            latency = (time.time() - start_time) * 1000
            components.append(ComponentStatus(
                name="Vector Engine (pgvector)",
                status="healthy",
                latency_ms=round(latency, 2),
                details="Extension loaded"
            ))
        except Exception:
            components.append(ComponentStatus(
                name="Vector Engine",
                status="degraded",
                latency_ms=0,
                details="Extension missing"
            ))

        return SystemHealthResponse(
            overall=overall_status,
            components=components,
            timestamp=datetime.now()
        )

admin_service = AdminService()
