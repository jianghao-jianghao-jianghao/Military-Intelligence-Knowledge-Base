
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

# 配置密码哈希算法，使用 Argon2 (推荐用于高安全场景)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证明文密码是否与哈希匹配
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    生成密码哈希
    """
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], claims: dict = None) -> str:
    """
    创建 JWT 访问令牌
    :param subject: 主题 (通常是 username)
    :param claims: 额外的载荷信息 (如 role, clearance)
    """
    if claims is None:
        claims = {}
    
    # 设置过期时间
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    to_encode.update(claims)
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
