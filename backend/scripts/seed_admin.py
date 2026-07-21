"""Cria (ou atualiza a senha do) usuário administrador inicial.

Uso:
    python -m scripts.seed_admin
Lê FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD / FIRST_ADMIN_NAME do .env.
"""
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


def main() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == settings.FIRST_ADMIN_EMAIL))
        if user:
            user.hashed_password = hash_password(settings.FIRST_ADMIN_PASSWORD)
            user.role = "admin"
            user.is_active = True
            action = "atualizado"
        else:
            user = User(
                email=settings.FIRST_ADMIN_EMAIL,
                full_name=settings.FIRST_ADMIN_NAME,
                role="admin",
                is_active=True,
                hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
            )
            db.add(user)
            action = "criado"
        db.commit()
        print(f"Admin {action}: {settings.FIRST_ADMIN_EMAIL}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
