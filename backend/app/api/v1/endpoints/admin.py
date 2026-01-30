
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Any, List
from uuid import UUID

from app.api.deps import SessionDep, CurrentUser
from app.schemas.common import ApiResponse
from app.schemas.admin import (
    RegistrationRequestResponse, 
    FAQCreate, FAQUpdate, FAQResponse,
    PolicyCreate, PolicyUpdate, PolicyResponse,
    AdminUserCreate, AdminUserUpdate, AdminUserResponse,
    SearchConfigResponse, UpdateSearchConfigRequest, GlobalSearchConfig,
    AuditLogResponse, AuditExportRequest, AuditExportResponse, SystemHealthResponse
)
from app.schemas.document import KBCreate, KBUpdate, KBResponse
from app.crud.crud_auth import auth_crud
from app.crud.crud_gov import gov_crud
from app.crud.crud_document import document_crud
from app.services.admin_service import admin_service

router = APIRouter()

# --- 1. 待办审计 (Registrations) ---

@router.get("/registrations", response_model=ApiResponse[List[RegistrationRequestResponse]])
async def get_registration_requests(
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    requests = await auth_crud.get_pending_requests(db)
    data = [RegistrationRequestResponse.from_orm_payload(r) for r in requests]
    return ApiResponse(data=data)

@router.post("/registrations/{id}/approve", response_model=ApiResponse[bool])
async def approve_registration(
    id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    await admin_service.approve_registration(db, id, current_user)
    return ApiResponse(data=True, message="User approved and created.")

@router.post("/registrations/{id}/reject", response_model=ApiResponse[bool])
async def reject_registration(
    id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    await admin_service.reject_registration(db, id, current_user)
    return ApiResponse(data=True, message="Request rejected.")


# --- 2. 人员治理 (User Governance) ---

@router.get("/users", response_model=ApiResponse[List[AdminUserResponse]])
async def get_users(
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    users = await auth_crud.get_users(db, skip, limit)
    resp_list = []
    c_map = {0: "非涉密", 1: "内部公开", 2: "秘密", 3: "机密"}
    for u in users:
        resp_list.append(AdminUserResponse(
            id=u.id,
            name=u.full_name or "",
            username=u.username,
            departmentId=u.department_id,
            roleId=u.role_id,
            clearance=c_map.get(u.clearance_level, "内部公开"),
            status=u.status,
            lastLogin=u.last_login_at
        ))
    return ApiResponse(data=resp_list)

@router.post("/users", response_model=ApiResponse[AdminUserResponse])
async def create_user(
    user_in: AdminUserCreate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    new_user = await admin_service.create_user(db, user_in)
    c_map = {0: "非涉密", 1: "内部公开", 2: "秘密", 3: "机密"}
    return ApiResponse(data=AdminUserResponse(
        id=new_user.id,
        name=new_user.full_name or "",
        username=new_user.username,
        departmentId=new_user.department_id,
        roleId=new_user.role_id,
        clearance=c_map.get(new_user.clearance_level, "内部公开"),
        status=new_user.status,
        lastLogin=new_user.last_login_at
    ))

@router.put("/users/{id}", response_model=ApiResponse[AdminUserResponse])
async def update_user(
    id: UUID,
    user_in: AdminUserUpdate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    updated_user = await admin_service.update_user(db, id, user_in)
    c_map = {0: "非涉密", 1: "内部公开", 2: "秘密", 3: "机密"}
    return ApiResponse(data=AdminUserResponse(
        id=updated_user.id,
        name=updated_user.full_name or "",
        username=updated_user.username,
        departmentId=updated_user.department_id,
        roleId=updated_user.role_id,
        clearance=c_map.get(updated_user.clearance_level, "内部公开"),
        status=updated_user.status,
        lastLogin=updated_user.last_login_at
    ))

@router.delete("/users/{id}", response_model=ApiResponse[bool])
async def delete_user(
    id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    await admin_service.delete_user(db, id)
    return ApiResponse(data=True)


# --- 3. 资源库管理 (KB Management) ---

@router.get("/kbs", response_model=ApiResponse[List[KBResponse]])
async def get_kbs(
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    kbs = await document_crud.get_all_kbs(db)
    resp_list = [admin_service.format_kb_response(kb) for kb in kbs]
    return ApiResponse(data=resp_list)

@router.post("/kbs", response_model=ApiResponse[KBResponse])
async def create_kb(
    kb_in: KBCreate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    new_kb = await admin_service.create_kb(db, kb_in, current_user.id)
    return ApiResponse(data=admin_service.format_kb_response(new_kb))

@router.put("/kbs/{id}", response_model=ApiResponse[KBResponse])
async def update_kb(
    id: UUID,
    kb_in: KBUpdate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    updated_kb = await admin_service.update_kb(db, id, kb_in)
    return ApiResponse(data=admin_service.format_kb_response(updated_kb))

@router.delete("/kbs/{id}", response_model=ApiResponse[bool])
async def delete_kb(
    id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    await admin_service.delete_kb(db, id)
    return ApiResponse(data=True)


# --- 4. QA 治理 (FAQ Governance) ---

@router.get("/faqs/pending", response_model=ApiResponse[List[FAQResponse]])
async def get_pending_faqs(
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    faqs = await gov_crud.get_faqs(db, status="PENDING")
    resp_list = []
    c_map = {0: "非涉密", 1: "内部公开", 2: "秘密", 3: "机密"}
    for f in faqs:
        resp_list.append(FAQResponse(
            id=f.id,
            question=f.question,
            answer=f.answer,
            category=f.category,
            status=f.status,
            clearance=c_map.get(f.clearance, "内部公开"),
            lastUpdated=f.last_updated
        ))
    return ApiResponse(data=resp_list)

@router.post("/faqs", response_model=ApiResponse[FAQResponse])
async def create_manual_faq(
    faq_in: FAQCreate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    faq = await gov_crud.create_faq(db, faq_in, status="APPROVED")
    c_map = {0: "非涉密", 1: "内部公开", 2: "秘密", 3: "机密"}
    return ApiResponse(data=FAQResponse(
        id=faq.id,
        question=faq.question,
        answer=faq.answer,
        category=faq.category,
        status=faq.status,
        clearance=c_map.get(faq.clearance, "内部公开"),
        lastUpdated=faq.last_updated
    ))

@router.put("/faqs/{id}", response_model=ApiResponse[FAQResponse])
async def update_faq(
    id: UUID,
    faq_in: FAQUpdate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    faq = await gov_crud.get_faq(db, id)
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    updated_faq = await gov_crud.update_faq(db, faq, faq_in)
    c_map = {0: "非涉密", 1: "内部公开", 2: "秘密", 3: "机密"}
    return ApiResponse(data=FAQResponse(
        id=updated_faq.id,
        question=updated_faq.question,
        answer=updated_faq.answer,
        category=updated_faq.category,
        status=updated_faq.status,
        clearance=c_map.get(updated_faq.clearance, "内部公开"),
        lastUpdated=updated_faq.last_updated
    ))

@router.delete("/faqs/{id}", response_model=ApiResponse[bool])
async def delete_faq(
    id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    await gov_crud.delete_faq(db, id)
    return ApiResponse(data=True)

@router.post("/faqs/{id}/approve", response_model=ApiResponse[bool])
async def approve_faq_route(
    id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    await admin_service.approve_faq(db, id)
    return ApiResponse(data=True)

@router.post("/faqs/{id}/reject", response_model=ApiResponse[bool])
async def reject_faq_route(
    id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    await admin_service.reject_faq(db, id)
    return ApiResponse(data=True)


# --- 5. 合规策略 (DLP Policies) ---

@router.get("/policies", response_model=ApiResponse[List[PolicyResponse]])
async def get_policies(
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    policies = await gov_crud.get_policies(db)
    return ApiResponse(data=policies)

@router.post("/policies", response_model=ApiResponse[PolicyResponse])
async def create_policy(
    policy_in: PolicyCreate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    policy = await gov_crud.create_policy(db, policy_in)
    return ApiResponse(data=policy)

@router.put("/policies/{id}", response_model=ApiResponse[PolicyResponse])
async def update_policy(
    id: UUID,
    policy_in: PolicyUpdate,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    policy = await gov_crud.get_policy(db, id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    updated = await gov_crud.update_policy(db, policy, policy_in)
    return ApiResponse(data=updated)

@router.delete("/policies/{id}", response_model=ApiResponse[bool])
async def delete_policy(
    id: UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    await gov_crud.delete_policy(db, id)
    return ApiResponse(data=True)


# --- 6. 检索策略 (Search Configuration) ---

@router.get("/search-config", response_model=ApiResponse[GlobalSearchConfig])
async def get_search_config(
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    config_data = await gov_crud.get_system_config(db, key="global_search_config")
    
    if not config_data:
        default_config = GlobalSearchConfig(
            strategy="hybrid",
            tiers={"faq": True, "graph": True, "docs": True, "llm": True},
            enhanced={"queryRewrite": True, "hyde": False, "stepback": True},
            parameters={"topK": 5, "threshold": 0.75}
        )
        return ApiResponse(data=default_config)
    
    return ApiResponse(data=GlobalSearchConfig(**config_data))

@router.put("/search-config", response_model=ApiResponse[GlobalSearchConfig])
async def update_search_config(
    req: UpdateSearchConfigRequest,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    config_dict = req.config.model_dump()
    updated_data = await gov_crud.upsert_system_config(
        db, 
        key="global_search_config", 
        value=config_dict, 
        description="Global RAG Search Parameters"
    )
    return ApiResponse(data=GlobalSearchConfig(**updated_data))


# --- 7. 审计日志 (Audit Logs) ---

@router.get("/audit-logs", response_model=ApiResponse[List[AuditLogResponse]])
async def get_audit_logs(
    db: SessionDep,
    current_user: CurrentUser,
    page: int = 1,
    limit: int = 20
) -> Any:
    """
    分页获取审计日志
    """
    skip = (page - 1) * limit
    logs = await gov_crud.get_audit_logs(db, skip=skip, limit=limit)
    
    # 转换状态码
    resp_logs = []
    for log in logs:
        status_str = AuditLogResponse.map_status(log.status)
        # Note: Pydantic v2 from_attributes helps map ORM fields to Schema aliases
        log_resp = AuditLogResponse(
            id=log.id,
            timestamp=log.created_at,
            userId=log.user_id,
            userName=log.user_name,
            action=log.action,
            resource=log.resource_target,
            status=status_str,
            ip_address=str(log.ip_address) if log.ip_address else None
        )
        resp_logs.append(log_resp)
        
    return ApiResponse(data=resp_logs)

@router.post("/audit-logs/export", response_model=ApiResponse[AuditExportResponse])
async def export_audit_logs(
    req: AuditExportRequest,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    导出审计日志
    """
    resp = await admin_service.export_audit_logs(db, req)
    return ApiResponse(data=resp)


# --- 8. 系统健康 (System Health) ---

@router.get("/system/health", response_model=ApiResponse[SystemHealthResponse])
async def check_system_health(
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    系统组件健康状态检查 (Admin Dashboard Use)
    """
    health = await admin_service.check_system_health(db)
    return ApiResponse(data=health)
