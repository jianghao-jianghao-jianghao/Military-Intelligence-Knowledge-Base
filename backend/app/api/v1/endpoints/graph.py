
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, List
from app.api.deps import SessionDep, CurrentUser
from app.schemas.common import ApiResponse
from app.schemas.graph import (
    GraphData, EntityDetail, PathDiscoveryRequest, PathDiscoveryResult,
    EvolutionSnapshot, EvolutionEvent
)
from app.crud.crud_graph import graph_crud

router = APIRouter()

@router.get("/query", response_model=ApiResponse[GraphData])
async def query_graph(
    db: SessionDep,
    current_user: CurrentUser,
    limit: int = 50
) -> Any:
    """
    获取图谱概览数据 (Nodes & Edges)
    用于前端初始化渲染。
    """
    # 可以在此添加基于 current_user 的权限过滤逻辑
    graph_data = await graph_crud.get_initial_graph(db, limit=limit)
    return ApiResponse(data=graph_data)

@router.get("/entities/{entity_id}", response_model=ApiResponse[EntityDetail])
async def get_entity_detail(
    entity_id: str,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    获取单个实体的详细画像
    包括属性、关联文档等。
    """
    detail = await graph_crud.get_entity_detail(db, entity_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    return ApiResponse(data=detail)

@router.post("/path", response_model=ApiResponse[PathDiscoveryResult])
async def find_entity_path(
    req: PathDiscoveryRequest,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    路径发现：查找两个实体之间的关联路径
    用于发现隐性关系（如供应链风险传导）。
    """
    # 这里我们传递 name 属性进行查找，因为前端输入的可能是名称
    # 实际应用中建议前端传递确定的 ID
    paths = await graph_crud.find_path(db, req.start_entity_id, req.end_entity_id)
    
    # Mock data if empty (AGE path parsing is complex)
    if not paths:
        # 仅为演示接口连通性，若 DB 无数据返回空
        return ApiResponse(data=PathDiscoveryResult(paths=[]))

    return ApiResponse(data=PathDiscoveryResult(paths=paths))

@router.get("/evolution", response_model=ApiResponse[EvolutionSnapshot])
async def get_evolution_view(
    entity_id: str,
    date: str,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    时序演进分析
    返回指定实体在特定时间点的关联图谱快照。
    """
    snapshot = await graph_crud.get_evolution(db, entity_id, date)
    
    # 构造模拟事件 (真实场景应从 Graph 中查询 Event 节点)
    events = [
        EvolutionEvent(date="2016-05", title="定型试验", description="完成高原环境适应性测试"),
        EvolutionEvent(date="2018-12", title="列装", description="正式交付部队服役")
    ]
    
    return ApiResponse(data=EvolutionSnapshot(
        date=date,
        snapshot=snapshot,
        events=events
    ))
