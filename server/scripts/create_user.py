from sqlalchemy.orm import Session

from db.database import SessionLocal
from models.user import User
from auth.security import hash_password

def create_user(
    email: str,
    password: str,
    firstname: str,
    lastname: str,
    role: str = "user",
):
    db: Session = SessionLocal()

    user = User(
        email=email,
        password_hash=hash_password(password),
        firstname=firstname,
        lastname=lastname,
        role=role,
        active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    print("✅ User created:")
    print("ID:", user.id)
    print("Email:", user.email)
    print("Role:", user.role)

    db.close()


if __name__ == "__main__":
    create_user(
        email="admin@test.de",
        password="admin123",
        firstname="Admin",
        lastname="User",
        role="admin",
    )
