
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc
from app.models.chat import Conversation, Message
from app.schemas.chat import SessionCreate, SessionUpdate, MessageRole

class CRUDChat:
    """
    Chat 模块的数据库操作
    """

    async def create_session(self, db: AsyncSession, obj_in: SessionCreate, user_id: UUID) -> Conversation:
        """
        创建新会话
        """
        db_obj = Conversation(
            user_id=user_id,
            title=obj_in.title or "新会话",
            bound_kb_ids=obj_in.bound_kb_ids,
            config_snapshot={}
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_user_sessions(self, db: AsyncSession, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Conversation]:
        """
        获取用户的历史会话列表
        """
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(desc(Conversation.updated_at))
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_session(self, db: AsyncSession, session_id: UUID, user_id: UUID) -> Optional[Conversation]:
        """
        获取单个会话（含权限校验）
        """
        stmt = select(Conversation).where(
            Conversation.id == session_id,
            Conversation.user_id == user_id
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def update_session(self, db: AsyncSession, session_id: UUID, obj_in: SessionUpdate) -> Conversation:
        """
        更新会话标题
        """
        stmt = select(Conversation).where(Conversation.id == session_id)
        result = await db.execute(stmt)
        db_obj = result.scalars().first()
        if db_obj:
            db_obj.title = obj_in.title
            await db.commit()
            await db.refresh(db_obj)
        return db_obj

    async def delete_session(self, db: AsyncSession, session_id: UUID, user_id: UUID):
        """
        删除会话
        """
        stmt = delete(Conversation).where(
            Conversation.id == session_id,
            Conversation.user_id == user_id
        )
        await db.execute(stmt)
        await db.commit()

    async def create_message(
        self, 
        db: AsyncSession, 
        conversation_id: UUID, 
        role: str, 
        content: str, 
        thought_chain: list = None, 
        citations: list = None
    ) -> Message:
        """
        创建一条消息记录
        """
        db_obj = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            thought_chain=thought_chain,
            citations=citations
        )
        db.add(db_obj)
        # 更新会话的 updated_at 时间
        await db.connection().execute(
            text("UPDATE chat.conversations SET updated_at = NOW() WHERE id = :id"),
            {"id": conversation_id}
        )
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_messages(self, db: AsyncSession, conversation_id: UUID) -> List[Message]:
        """
        获取会话的所有消息
        """
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

chat_crud = CRUDChat()
