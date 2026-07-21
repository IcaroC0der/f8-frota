"""Dependências compartilhadas: sessão de banco e usuário autenticado (JWT)."""
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    subject = decode_access_token(token)
    if subject is None:
        raise credentials_exc
    try:
        user = db.get(User, UUID(subject))
    except (ValueError, TypeError):
        raise credentials_exc
    if user is None:
        raise credentials_exc
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Usuário inativo.")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Requer privilégios de administrador."
        )
    return current_user
