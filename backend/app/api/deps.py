
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.config import settings
from app.crud.crud_auth import auth_crud
from app.models.auth import User

# 定义 OAuth2 方案
# 指向 /auth/access-token 接口，该接口支持 Form 表单提交，适配 Swagger UI 的 "Authorize" 按钮
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/access-token")

# DB 依赖类型别名
SessionDep = Annotated[AsyncSession, Depends(get_db)]
# Token 依赖类型别名
TokenDep = Annotated[str, Depends(oauth2_scheme)]

async def get_current_user(
    db: SessionDep,
    token: TokenDep
) -> User:
    """
    核心依赖：根据 JWT Token 获取当前登录用户对象。
    如果 Token 无效或过期，抛出 401 错误。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 解码 JWT
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # 查询数据库获取最新用户信息 (避免 Token 中的信息滞后)
    user = await auth_crud.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    
    if user.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

# 类型别名：注入当前用户
CurrentUser = Annotated[User, Depends(get_current_user)]
