
import uuid
import logging
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile

from app.db.session import AsyncSessionLocal
from app.models.kms import Document, DocumentChunk
from app.crud.crud_document import document_crud
from app.services.embedding_service import embedding_service
from app.utils.file_converter import file_converter

logger = logging.getLogger(__name__)

class IngestionService:
    """
    文档入库与处理流水线
    通常作为后台任务运行，避免阻塞 API。
    Pipeline: Upload -> Parse -> Chunk -> Embed -> Save
    """

    async def process_document_task(self, doc_id: uuid.UUID, file_content: bytes, filename: str):
        """
        后台任务入口：处理单个文档
        """
        async with AsyncSessionLocal() as db:
            try:
                logger.info(f"Starting ingestion for document {doc_id}")
                
                # 1. 解析文件内容 (Parse)
                # 为了复用 file_converter，我们需要模拟一个 UploadFile 对象或修改 parser 接口
                # 这里简化处理，假设 parser 可以处理 bytes 流
                # 由于 file_converter 依赖 UploadFile，我们在 Service 层做个适配
                from fastapi import UploadFile
                import io
                
                file_obj = UploadFile(filename=filename, file=io.BytesIO(file_content))
                text_content = await file_converter.parse_to_markdown(file_obj)
                
                if not text_content:
                    raise ValueError("Empty content after parsing")

                # 2. 文本切片 (Chunking)
                # 使用简单的字符长度切分，生产环境应使用 RecursiveCharacterTextSplitter (LangChain)
                chunks_text = self._recursive_split(text_content, chunk_size=500, overlap=50)
                
                logger.info(f"Document split into {len(chunks_text)} chunks")

                # 3. 向量化 (Embedding) & 构造对象
                doc = await document_crud.get_document(db, doc_id)
                if not doc:
                    logger.error(f"Document {doc_id} not found during processing")
                    return

                chunk_objs = []
                for i, text_chunk in enumerate(chunks_text):
                    vector = await embedding_service.get_embedding(text_chunk)
                    
                    chunk_obj = DocumentChunk(
                        doc_id=doc_id,
                        kb_id=doc.kb_id,
                        content=text_chunk,
                        embedding=vector,
                        chunk_idx=i,
                        page_idx=0 # 解析器暂未返回页码，默认为 0
                    )
                    chunk_objs.append(chunk_obj)

                # 4. 批量写入 DB
                await document_crud.create_chunks(db, chunk_objs)
                
                # 5. 更新文档状态
                await document_crud.update_document_status(db, doc_id, "READY")
                logger.info(f"Document {doc_id} processing complete.")

            except Exception as e:
                logger.error(f"Ingestion failed for doc {doc_id}: {str(e)}")
                await document_crud.update_document_status(db, doc_id, "FAILED")

    def _recursive_split(self, text: str, chunk_size: int, overlap: int) -> List[str]:
        """
        简易切片算法
        """
        if not text:
            return []
        
        chunks = []
        start = 0
        text_len = len(text)
        
        while start < text_len:
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start += chunk_size - overlap
            
        return chunks

ingestion_service = IngestionService()
