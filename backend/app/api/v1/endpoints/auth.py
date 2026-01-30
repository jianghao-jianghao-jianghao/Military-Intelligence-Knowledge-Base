
from typing import Any, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.api.deps import SessionDep, CurrentUser
from app.schemas.common import ApiResponse
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, RegistrationResponse, UserResponse, ClearanceLevel, Token
from app.crud.crud_auth import auth_crud
from app.core.security import create_access_token, get_password_hash

router = APIRouter()

@router.post("/access-token", response_model=Token)
async def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: SessionDep
) -> Any:
    """
    OAuth2 兼容的 Token 获取接口 (供 Swagger UI 使用)
    接受表单数据 (username, password)
    """
    user = await auth_crud.authenticate(db, username=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password"
        )
    
    if user.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="User account is locked or inactive")

    access_token = create_access_token(
        subject=user.username,
        claims={
            "role_id": str(user.role_id) if user.role_id else None,
            "dept_id": str(user.department_id) if user.department_id else None,
            "clearance": user.clearance_level
        }
    )
    
    # 返回标准 OAuth2 Token 结构
    return Token(access_token=access_token, token_type="bearer")

@router.post("/login", response_model=ApiResponse[LoginResponse])
async def login(
    login_data: LoginRequest,
    db: SessionDep
) -> Any:
    """
    用户登录接口 (供前端 SPA 使用)
    接受 JSON 数据
    """
    user = await auth_crud.authenticate(db, username=login_data.username, password=login_data.secret)
    if not user:
        # 为了安全，不提示是用户名错误还是密码错误
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password"
        )
    
    if user.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="User account is locked or inactive")

    # 生成 Token，包含必要的声明 (Claims)
    access_token = create_access_token(
        subject=user.username,
        claims={
            "role_id": str(user.role_id) if user.role_id else None,
            "dept_id": str(user.department_id) if user.department_id else None,
            "clearance": user.clearance_level
        }
    )

    return ApiResponse(
        data=LoginResponse(
            token=access_token,
            user=user # Pydantic 会自动过滤掉 password_hash
        )
    )

@router.post("/register", response_model=ApiResponse[RegistrationResponse])
async def register(
    reg_in: RegisterRequest,
    db: SessionDep
) -> Any:
    """
    用户注册申请接口
    不直接创建用户，而是创建一条待审计的申请记录。
    """
    # 1. 检查用户名是否已存在
    existing_user = await auth_crud.get_user_by_username(db, reg_in.username)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )

    # 2. 映射前端的密级字符串到整数值 (简单映射，实际应用可能更复杂)
    clearance_map = {
        "非涉密": ClearanceLevel.UNCLASSIFIED,
        "内部公开": ClearanceLevel.INTERNAL,
        "秘密": ClearanceLevel.CONFIDENTIAL,
        "机密": ClearanceLevel.SECRET
    }
    # 默认为 INTERNAL
    clearance_int = clearance_map.get(reg_in.intendedClearance, ClearanceLevel.INTERNAL)

    # 3. 构造 Payload (包含哈希后的密码，以便管理员批准后直接入库)
    hashed_password = get_password_hash(reg_in.password)
    
    user_payload = {
        "username": reg_in.username,
        "password_hash": hashed_password,
        "full_name": reg_in.fullName,
        "department_id": reg_in.departmentId,
        "clearance_level": clearance_int,
        "role_id": None # 初始无角色，由管理员分配
    }

    # 4. 创建申请记录
    request_obj = await auth_crud.create_registration_request(db, reg_in, user_payload)

    return ApiResponse(
        data=RegistrationResponse(
            requestId=request_obj.id,
            status=request_obj.status
        )
    )

@router.get("/me", response_model=ApiResponse[dict])
async def read_users_me(
    current_user: CurrentUser
) -> Any:
    """
    获取当前登录用户信息
    """
    # 构造符合 api_docs.md 的响应结构 { user: {...} }
    # 使用 UserResponse Pydantic 模型进行序列化
    user_dto = UserResponse.model_validate(current_user)
    
    return ApiResponse(
        data={
            "user": user_dto
        }
    )

@router.post("/logout", response_model=ApiResponse[bool])
async def logout() -> Any:
    """
    用户登出
    """
    return ApiResponse(data=True)
