import os
import re
from sqlalchemy.orm import Session

from db.database import SessionLocal
from models.user import User
from utils.passwords import generate_password, hash_plain_password


def slugify_username(value: str) -> str:
    value = (value or "").strip().lower()
    # replace spaces with hyphens
    value = re.sub(r"\s+", "-", value)
    # keep only a-z, 0-9, underscore, hyphen, dot
    value = re.sub(r"[^a-z0-9_.-]", "", value)
    # avoid empty usernames
    return value or "admin"


def main():
    email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "system@jwco.local")
    display_name = os.getenv("BOOTSTRAP_ADMIN_NAME", "Congregation Admin")
    username_env = os.getenv("BOOTSTRAP_ADMIN_USERNAME")  # optional
    enabled = os.getenv("BOOTSTRAP_ADMIN_ENABLED", "true").lower() in ("1", "true", "yes", "y")

    if not enabled:
        print("ℹ️  Admin bootstrap is disabled (BOOTSTRAP_ADMIN_ENABLED=false).")
        return

    # split display name
    parts = display_name.strip().split(" ", 1)
    firstname = parts[0] if parts and parts[0] else "Congregation"
    lastname = parts[1] if len(parts) > 1 else "Admin"

    # derive username
    if username_env and username_env.strip():
        username = slugify_username(username_env)
    else:
        # prefer name-based, fallback to email local-part
        name_based = slugify_username(display_name)
        email_local = slugify_username(email.split("@")[0] if "@" in email else email)
        username = name_based or email_local

    db: Session = SessionLocal()
    try:
        # If admin already exists -> do nothing
        existing = (
            db.query(User)
            .filter((User.email == email) | (User.username == username))
            .first()
        )
        if existing:
            print("✅ Admin already exists.")
            print(f"   Email: {existing.email}")
            print(f"   Username: {getattr(existing, 'username', '(missing)')}")
            print(f"   Role: {existing.role}")
            db.close()
            return

        pw = generate_password()

        user = User(
            email=email,
            username=username,
            firstname=firstname,
            lastname=lastname,
            password_hash=hash_plain_password(pw),
            role="admin",
            active=True,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print("✅ Initial admin created.")
        print(f"   Email: {email}")
        print(f"   Username: {username}")
        print(f"   Password: {pw}")
        print("⚠️  Please store this password securely now — it will not be shown again.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
