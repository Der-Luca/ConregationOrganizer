import os
from sqlalchemy.orm import Session

from db.database import SessionLocal
from models.user import User
from utils.passwords import generate_password, hash_plain_password

def main():
    email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "system@jwco.local")
    display_name = os.getenv("BOOTSTRAP_ADMIN_NAME", "Congregation Admin")

    # Name splitten (einfach)
    parts = display_name.strip().split(" ", 1)
    firstname = parts[0]
    lastname = parts[1] if len(parts) > 1 else "Admin"

    db: Session = SessionLocal()

    # Wenn schon existiert -> nix tun
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"✅ Admin existiert schon: {existing.email} (role={existing.role})")
        db.close()
        return

    pw = generate_password()
    user = User(
        email=email,
        firstname=firstname,
        lastname=lastname,
        password_hash=hash_plain_password(pw),
        role="admin",
        active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    print("✅ Initial Admin erstellt")
    print(f"Email: {email}")
    print(f"Passwort: {pw}")
    print("⚠️ Bitte Passwort jetzt sicher speichern – es wird nicht nochmal angezeigt.")

if __name__ == "__main__":
    main()
