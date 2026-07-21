from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, Token
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos."
        )
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Usuário inativo.")
    return user


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    """Login padrão OAuth2 (usado pelo botão Authorize do Swagger). O campo
    `username` deve receber o e-mail."""
    user = _authenticate(db, form.username, form.password)
    return Token(access_token=create_access_token(str(user.id)))


@router.post("/login/json", response_model=Token)
def login_json(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    """Login por JSON — conveniente para o frontend Vue."""
    user = _authenticate(db, payload.email, payload.password)
    return Token(access_token=create_access_token(str(user.id)))


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    """Auto-registro. Sempre cria usuário comum (role forçado a 'user');
    contas admin são criadas pelo seed ou por outro admin em /users."""
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "E-mail já cadastrado.")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role="user",
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Troca a senha do próprio usuário logado (valida a senha atual)."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Senha atual incorreta.")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"status": "ok"}
