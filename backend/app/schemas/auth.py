from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    """Login por JSON (alternativa ao form OAuth2 usado pelo Swagger)."""

    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    """Troca da própria senha pelo usuário logado."""

    current_password: str
    new_password: str = Field(min_length=6)
