from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel

Role = Literal["admin", "user"]


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: Role = "user"
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = Field(default=None, min_length=6)
    role: Role | None = None
    is_active: bool | None = None


class UserResponse(ORMModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    role: Role
    is_active: bool
    created_at: datetime
    updated_at: datetime
