
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from uuid import UUID

# --- Basic Graph Elements ---

class GraphNode(BaseModel):
    """
    图谱节点
    """
    id: str # AGE 返回的 ID 通常是整数或特定格式字符串，这里统一用 str
    label: str # 显示名称
    type: str # 节点类型 (Label): Weapon, Manufacturer, etc.
    color: Optional[str] = None
    properties: Dict[str, Any] = {} # 原始属性
    
    # 布局坐标 (可选，部分场景后端计算布局)
    x: Optional[float] = 0
    y: Optional[float] = 0

class GraphEdge(BaseModel):
    """
    图谱连边
    """
    id: str
    source: str # Source Node ID
    target: str # Target Node ID
    label: str # 关系名称 (Type): DEVELOPED_BY, etc.
    properties: Dict[str, Any] = {}

class GraphData(BaseModel):
    """
    通用图数据包
    """
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# --- Entity Details ---

class EntityAttribute(BaseModel):
    key: str
    value: str

class RelatedDoc(BaseModel):
    id: UUID
    title: str
    type: Optional[str] = None

class EntityDetail(BaseModel):
    """
    实体画像详情
    """
    id: str
    name: str
    type: str
    image_url: Optional[str] = None
    attributes: List[EntityAttribute]
    related_docs: List[RelatedDoc] # 关联的文档 (通过 MENTIONED_IN 边或属性关联)

# --- Advanced Query Payloads ---

class PathDiscoveryRequest(BaseModel):
    start_entity_id: str
    end_entity_id: str
    max_hops: int = 5

class PathDiscoveryResult(BaseModel):
    paths: List[GraphData] # 可能有多条路径

class EvolutionEvent(BaseModel):
    date: str
    title: str
    description: str

class EvolutionSnapshot(BaseModel):
    date: str
    snapshot: GraphData
    events: List[EvolutionEvent]
