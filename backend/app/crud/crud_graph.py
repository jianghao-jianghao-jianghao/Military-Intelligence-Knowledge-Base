
import json
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.graph import GraphData, GraphNode, GraphEdge, EntityDetail, EntityAttribute, RelatedDoc

class CRUDGraph:
    """
    封装 Apache AGE 图数据库操作
    注意：PostgreSQL + AGE 的交互通常通过 cypher() 函数执行原生 SQL。
    """

    def _parse_age_vertex(self, row: Any) -> GraphNode:
        """
        解析 AGE 返回的顶点 (Vertex) 数据结构
        """
        # AGE 返回的 vertex 通常是一个包含 id, label, properties 的对象
        # 具体的解析依赖于驱动，这里假设返回的是 agtype 解析后的 dict 或类似的结构
        # 示例结构: {'id': 1688849860263937, 'label': 'Weapon', 'properties': {'name': '15式'}}
        
        # 在 asyncpg/sqlalchemy 中，如果不使用特定 age 驱动，可能返回的是字符串，需 json.loads
        # 这里做一种防御性处理
        data = row
        if isinstance(data, str):
            data = json.loads(data)
            
        props = data.get("properties", {})
        label = data.get("label", "Unknown")
        
        # 根据类型分配颜色 (Mock Logic, 实际可存入 DB 或前端处理)
        color_map = {
            "Weapon": "#0366d6",
            "Manufacturer": "#1c2128",
            "System": "#9a6700",
            "Event": "#1a7f37"
        }

        return GraphNode(
            id=str(data["id"]),
            label=props.get("name", label), # 优先显示 name 属性
            type=label,
            color=color_map.get(label, "#57606a"),
            properties=props
        )

    def _parse_age_edge(self, row: Any) -> GraphEdge:
        """
        解析 AGE 返回的边 (Edge) 数据结构
        """
        # 示例结构: {'id': ..., 'label': 'DEVELOPED_BY', 'start_id': ..., 'end_id': ..., 'properties': {}}
        data = row
        if isinstance(data, str):
            data = json.loads(data)
            
        return GraphEdge(
            id=str(data["id"]),
            source=str(data["start_id"]),
            target=str(data["end_id"]),
            label=data["label"],
            properties=data.get("properties", {})
        )

    async def get_initial_graph(self, db: AsyncSession, limit: int = 50) -> GraphData:
        """
        获取图谱概览（默认查询中心节点及其一跳邻居）
        """
        # 构造 Cypher 查询: 随机选取 limit 条关系
        query = text("""
            SELECT * FROM cypher('military_graph', $$
                MATCH (n)-[r]-(m)
                RETURN n, r, m
                LIMIT :limit
            $$) as (n agtype, r agtype, m agtype);
        """)
        
        result = await db.execute(query, {"limit": limit})
        rows = result.all()
        
        nodes_map = {}
        edges_list = []
        
        for row in rows:
            # row.n, row.r, row.m
            n = self._parse_age_vertex(row[0])
            m = self._parse_age_vertex(row[2])
            r = self._parse_age_edge(row[1])
            
            nodes_map[n.id] = n
            nodes_map[m.id] = m
            edges_list.append(r)
            
        return GraphData(nodes=list(nodes_map.values()), edges=edges_list)

    async def get_entity_detail(self, db: AsyncSession, entity_id: str) -> Optional[EntityDetail]:
        """
        获取实体详情（属性 + 关联文档）
        """
        # 1. 查询节点自身属性
        # 注意: AGE 的 ID 查询通常需要 id() 函数，且 ID 是 int64
        # 这里简化处理，假设我们可以通过 id 查，或者我们通过 properties.uuid 查
        # 为演示方便，这里使用 id() 匹配
        try:
            eid = int(entity_id)
        except ValueError:
            return None # ID 格式不对

        query_node = text("""
            SELECT * FROM cypher('military_graph', $$
                MATCH (n)
                WHERE id(n) = :eid
                RETURN n
            $$) as (n agtype);
        """)
        
        res = await db.execute(query_node, {"eid": eid})
        node_row = res.fetchone()
        
        if not node_row:
            return None
            
        node = self._parse_age_vertex(node_row[0])
        
        # 2. 转换属性为 KV 列表
        attributes = [
            EntityAttribute(key=k, value=str(v)) 
            for k, v in node.properties.items() 
            if k not in ['name', 'uuid']
        ]
        
        # 3. 查询关联文档 (假设有 MENTIONED_IN 关系指向 Document 类型的节点，或者文档信息直接挂在属性上)
        # 这里模拟：查询关联的 Document 节点
        query_docs = text("""
            SELECT * FROM cypher('military_graph', $$
                MATCH (n)-[:MENTIONED_IN]-(d:Document)
                WHERE id(n) = :eid
                RETURN d
            $$) as (d agtype);
        """)
        res_docs = await db.execute(query_docs, {"eid": eid})
        doc_rows = res_docs.all()
        
        related_docs = []
        for d_row in doc_rows:
            d_node = self._parse_age_vertex(d_row[0])
            # 假设 Document 节点有 uuid 属性对应 kms.documents.id
            doc_uuid_str = d_node.properties.get('uuid')
            if doc_uuid_str:
                related_docs.append(RelatedDoc(
                    id=UUID(doc_uuid_str), 
                    title=d_node.properties.get('title', 'Unknown'),
                    type="技术文档"
                ))

        return EntityDetail(
            id=node.id,
            name=node.properties.get('name', 'Unknown'),
            type=node.type,
            attributes=attributes,
            related_docs=related_docs
        )

    async def find_path(self, db: AsyncSession, start_name: str, end_name: str) -> List[GraphData]:
        """
        发现两个实体之间的最短路径
        """
        # 使用 shortestPath 函数
        query = text("""
            SELECT * FROM cypher('military_graph', $$
                MATCH (start {name: :start_name}), (end {name: :end_name})
                MATCH p = shortestPath((start)-[*..10]-(end))
                RETURN p
            $$) as (p agtype);
        """)
        
        # 注意: AGE 返回 path 的格式比较特殊，通常是一组交替的 vertex 和 edge
        # 这里做 Mock 实现，假设返回数据已解析
        # 真实实现需要递归解析 path 对象
        
        # 暂时返回空列表，实际开发需根据 AGE 版本调整 Path 解析逻辑
        return []

    async def get_evolution(self, db: AsyncSession, entity_id: str, year: str) -> GraphData:
        """
        获取实体在特定时间点的演进状态
        (查询连接了 EVOLVED_FROM 边或特定时间 Event 的子图)
        """
        try:
            eid = int(entity_id)
        except ValueError:
            return GraphData(nodes=[], edges=[])

        query = text("""
            SELECT * FROM cypher('military_graph', $$
                MATCH (n)-[r:EVOLVED_FROM*..3]-(m)
                WHERE id(n) = :eid
                RETURN n, r, m
            $$) as (n agtype, r agtype, m agtype);
        """)
        
        result = await db.execute(query, {"eid": eid})
        rows = result.all()
        
        nodes_map = {}
        edges_list = []
        
        for row in rows:
            n = self._parse_age_vertex(row[0])
            m = self._parse_age_vertex(row[2])
            r = self._parse_age_edge(row[1])
            nodes_map[n.id] = n
            nodes_map[m.id] = m
            edges_list.append(r)
            
        return GraphData(nodes=list(nodes_map.values()), edges=edges_list)

graph_crud = CRUDGraph()
