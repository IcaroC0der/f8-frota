"""Hashing de senha (bcrypt) e emissão/validação de JWT."""
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# bcrypt considera apenas os primeiros 72 bytes da senha (e versões 4.x lançam
# erro acima disso), então truncamos de forma consistente no hash e na verificação.
_MAX_BCRYPT_BYTES = 72


def hash_password(plain: str) -> str:
    pwd = plain.encode("utf-8")[:_MAX_BCRYPT_BYTES]
    return bcrypt.hashpw(pwd, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain.encode("utf-8")[:_MAX_BCRYPT_BYTES], hashed.encode("utf-8")
        )
    except ValueError:
        return False


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Retorna o subject (id do usuário) se o token for válido, senão None."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("sub")
    except JWTError:
        return None
