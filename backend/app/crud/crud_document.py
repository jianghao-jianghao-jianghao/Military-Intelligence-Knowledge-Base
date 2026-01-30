
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, and_, update, text
from sqlalchemy.orm import selectinload
from app.models.kms import KnowledgeBase, KbACL, Document, DocumentChunk
from app.schemas.auth import ClearanceLevel
from app.models.auth import User

class CRUDDocument:
    """
    文档中心数据库操作
    """

    # --- Knowledge Base Operations ---

    async def get_authorized_kbs(self, db: AsyncSession, user: User) -> List[KnowledgeBase]:
        """
        获取当前用户有权访问的知识库列表 (User Side)
        """
        # 1. 基础密级过滤
        base_query = select(KnowledgeBase).where(
            KnowledgeBase.base_clearance <= user.clearance_level,
            KnowledgeBase.is_archived == False
        )

        # 2. ACL 关联查询
        acl_filter = or_(
            KnowledgeBase.owner_id == user.id, #也是拥有者
            KnowledgeBase.acls.any(
                or_(
                    and_(KbACL.subject_type == 'USER', KbACL.subject_id == user.id),
                    and_(KbACL.subject_type == 'ROLE', KbACL.subject_id == user.role_id),
                    and_(KbACL.subject_type == 'DEPT', KbACL.subject_id == user.department_id)
                )
            )
        )
        
        stmt = base_query.where(acl_filter).options(selectinload(KnowledgeBase.acls))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_all_kbs(self, db: AsyncSession) -> List[KnowledgeBase]:
        """
        获取所有知识库 (Admin Side)
        """
        stmt = select(KnowledgeBase).options(selectinload(KnowledgeBase.acls)).order_by(KnowledgeBase.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def create_kb(self, db: AsyncSession, kb_obj: KnowledgeBase, acls: List[KbACL]) -> KnowledgeBase:
        """
        创建知识库及初始 ACL
        """
        db.add(kb_obj)
        await db.flush() # 获取 ID
        
        for acl in acls:
            acl.kb_id = kb_obj.id
            db.add(acl)
            
        await db.commit()
        await db.refresh(kb_obj)
        # 重新加载关系
        stmt = select(KnowledgeBase).where(KnowledgeBase.id == kb_obj.id).options(selectinload(KnowledgeBase.acls))
        result = await db.execute(stmt)
        return result.scalars().first()

    async def update_kb(self, db: AsyncSession, kb_id: UUID, update_data: dict) -> KnowledgeBase:
        """
        更新 KB 基础信息
        """
        stmt = update(KnowledgeBase).where(KnowledgeBase.id == kb_id).values(**update_data).returning(KnowledgeBase)
        result = await db.execute(stmt)
        await db.commit()
        
        # Fetch updated with ACLs
        stmt = select(KnowledgeBase).where(KnowledgeBase.id == kb_id).options(selectinload(KnowledgeBase.acls))
        result = await db.execute(stmt)
        return result.scalars().first()

    async def update_kb_acls(self, db: AsyncSession, kb_id: UUID, new_acls: List[KbACL]):
        """
        全量更新 KB 的 ACL (先删后加)
        """
        # 1. 删除旧 ACL
        delete_stmt = delete(KbACL).where(KbACL.kb_id == kb_id)
        await db.execute(delete_stmt)
        
        # 2. 插入新 ACL
        for acl in new_acls:
            acl.kb_id = kb_id
            db.add(acl)
            
        await db.commit()

    async def delete_kb(self, db: AsyncSession, kb_id: UUID):
        """
        删除 KB (级联删除 Documents/Chunks/ACLs)
        """
        stmt = delete(KnowledgeBase).where(KnowledgeBase.id == kb_id)
        await db.execute(stmt)
        await db.commit()

    async def get_kb(self, db: AsyncSession, kb_id: UUID) -> Optional[KnowledgeBase]:
        """
        获取单个 KB 详情
        """
        stmt = select(KnowledgeBase).where(KnowledgeBase.id == kb_id).options(selectinload(KnowledgeBase.acls))
        result = await db.execute(stmt)
        return result.scalars().first()

    # --- Document Operations ---

    async def create_document(self, db: AsyncSession, doc: Document) -> Document:
        """
        创建文档索引记录
        """
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc
        
    async def update_document_status(self, db: AsyncSession, doc_id: UUID, status: str):
        """
        更新文档处理状态
        """
        stmt = update(Document).where(Document.id == doc_id).values(status=status)
        await db.execute(stmt)
        await db.commit()

    async def get_documents_by_kb(self, db: AsyncSession, kb_id: UUID, user_clearance: int) -> List[Document]:
        """
        获取指定库内的文档列表
        需再次过滤文档级密级 (Double Check)
        """
        stmt = (
            select(Document)
            .where(
                Document.kb_id == kb_id,
                Document.clearance <= user_clearance
            )
            .order_by(Document.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_document(self, db: AsyncSession, doc_id: UUID) -> Optional[Document]:
        """
        获取文档详情
        """
        stmt = select(Document).where(Document.id == doc_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    # --- Vector Search Operations (New) ---

    async def create_chunks(self, db: AsyncSession, chunks: List[DocumentChunk]):
        """
        批量写入文档切片
        """
        db.add_all(chunks)
        await db.commit()

    async def search_similar_chunks(
        self, 
        db: AsyncSession, 
        query_vector: List[float], 
        kb_ids: List[UUID], 
        limit: int = 5,
        score_threshold: float = 0.0
    ) -> List[Tuple[DocumentChunk, float]]:
        """
        核心向量检索方法 (Dense Retrieval)
        使用 pgvector 的 cosine_distance 操作符 (<=>)
        注意: cosine_distance = 1 - cosine_similarity
        """
        if not kb_ids:
            return []

        # 1 - cosine_distance 即为相似度
        similarity = 1 - DocumentChunk.embedding.cosine_distance(query_vector)
        
        stmt = (
            select(DocumentChunk, similarity.label("score"))
            .join(DocumentChunk.document) # Join Document 表以获取 metadata/title
            .where(
                DocumentChunk.kb_id.in_(kb_ids),
                similarity > score_threshold
            )
            .order_by(similarity.desc())
            .limit(limit)
            .options(selectinload(DocumentChunk.document)) # 预加载 Document 信息
        )
        
        result = await db.execute(stmt)
        return result.all() # 返回 [(Chunk, score), ...]

    async def search_keyword_chunks(
        self,
        db: AsyncSession,
        query_text: str,
        kb_ids: List[UUID],
        limit: int = 5
    ) -> List[DocumentChunk]:
        """
        基于 PostgreSQL 全文检索 (Sparse Retrieval)
        """
        if not kb_ids:
            return []
            
        # 使用 websearch_to_tsquery 处理用户输入的自然语言
        stmt = (
            select(DocumentChunk)
            .join(DocumentChunk.document)
            .where(
                DocumentChunk.kb_id.in_(kb_ids),
                text("to_tsvector('simple', content) @@ websearch_to_tsquery('simple', :q)")
            )
            .limit(limit)
            .options(selectinload(DocumentChunk.document))
        )
        
        result = await db.execute(stmt, {"q": query_text})
        return list(result.scalars().all())

document_crud = CRUDDocument()
