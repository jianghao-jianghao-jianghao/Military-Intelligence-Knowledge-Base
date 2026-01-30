
import uuid
from typing import List
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.kms import KnowledgeBase, Document, KbACL
from app.models.auth import User
from app.schemas.auth import ClearanceLevel
from app.schemas.document import KBCreate, KBResponse, PrintResponse, DesensitizeResponse
from app.crud.crud_document import document_crud

class DocumentService:
    """
    文档业务逻辑服务
    处理文件存储、解析、脱敏和打印申请
    """

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

    async def create_knowledge_base(self, db: AsyncSession, kb_in: KBCreate, owner_id: uuid.UUID) -> KBResponse:
        """
        创建知识库
        """
        # 1. 创建 KB 对象
        kb = KnowledgeBase(
            name=kb_in.name,
            description=kb_in.description,
            base_clearance=self._map_clearance_str_to_int(kb_in.clearance),
            owner_id=owner_id,
            settings={}
        )
        
        # 2. 构造 ACL 对象
        acls = []
        for uid in kb_in.authorized_users:
            acls.append(KbACL(subject_type='USER', subject_id=uid, permission='READ'))
        for rid in kb_in.authorized_roles:
            acls.append(KbACL(subject_type='ROLE', subject_id=rid, permission='READ'))
        for did in kb_in.authorized_departments:
            acls.append(KbACL(subject_type='DEPT', subject_id=did, permission='READ'))
            
        created_kb = await document_crud.create_kb(db, kb, acls)
        
        return self._format_kb_response(created_kb)

    async def list_authorized_kbs(self, db: AsyncSession, user: User) -> List[KBResponse]:
        """
        列出用户有权访问的 KB
        """
        kbs = await document_crud.get_authorized_kbs(db, user)
        return [self._format_kb_response(kb) for kb in kbs]

    def _format_kb_response(self, kb: KnowledgeBase) -> KBResponse:
        """
        Helper: 格式化 KB 响应，提取 ACL ID
        """
        # 注意: 这里假设 relationship 已经 eagerly loaded 或者在 session 中
        # 实际生产中应注意 N+1 问题，crud 中使用了 selectinload 优化
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

    async def upload_document(
        self, db: AsyncSession, file: UploadFile, kb_id: uuid.UUID, clearance_str: str, user: User
    ) -> Document:
        """
        上传文档并触发后续处理
        """
        # 1. 模拟上传到 MinIO / S3
        # s3_client.upload_fileobj(...)
        file_key = f"kbs/{kb_id}/{uuid.uuid4()}-{file.filename}"
        
        # 2. 写入 DB
        doc = Document(
            kb_id=kb_id,
            title=file.filename,
            s3_key=file_key,
            file_size=file.size,
            mime_type=file.content_type,
            clearance=self._map_clearance_str_to_int(clearance_str),
            status='INDEXING' # 初始状态
        )
        created_doc = await document_crud.create_document(db, doc)
        
        # 3. 触发异步任务 (Celery / BackgroundTasks)
        # background_tasks.add_task(process_document, created_doc.id)
        # 此处省略具体异步队列代码，假设文档状态会在处理后更新
        
        return created_doc

    async def generate_desensitized_url(self, db: AsyncSession, doc_id: uuid.UUID, user: User) -> DesensitizeResponse:
        """
        生成脱敏副本下载链接
        逻辑: 实时读取原文件 -> 调用 DLP 引擎替换敏感词 -> 生成临时文件 -> 返回链接
        """
        doc = await document_crud.get_document(db, doc_id)
        if not doc:
            raise ValueError("Document not found")
            
        # Mock Logic
        mock_url = f"https://mock-storage.internal/temp/desensitized_{doc.title}.txt"
        return DesensitizeResponse(url=mock_url)

    async def apply_print(self, db: AsyncSession, doc_id: uuid.UUID, reason: str, user: User) -> PrintResponse:
        """
        提交打印申请
        """
        # 实际应写入 audit_logs 和 workflow 表
        application_id = f"print-app-{uuid.uuid4().hex[:8]}"
        return PrintResponse(applicationId=application_id)

doc_service = DocumentService()
