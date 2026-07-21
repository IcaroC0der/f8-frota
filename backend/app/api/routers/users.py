from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

# Toda a gestão de usuários exige admin.
router = APIRouter(
    prefix="/users", tags=["users"], dependencies=[Depends(require_admin)]
)


@router.get("", response_model=list[UserResponse])
def list_users(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
) -> list[User]:
    return list(db.scalars(select(User).offset(skip).limit(limit)).all())


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "E-mail já cadastrado.")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado.")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID, payload: UserUpdate, db: Session = Depends(get_db)
) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado.")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        password = data.pop("password")
        if password:
            user.hashed_password = hash_password(password)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: UUID, db: Session = Depends(get_db)) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado.")
    db.delete(user)
    db.commit()
