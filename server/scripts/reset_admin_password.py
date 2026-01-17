import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from db.database import SessionLocal
from models.user import User
from utils.passwords import generate_password, hash_plain_password

load_dotenv() 

def main():
    admin_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL")
    admin_username = os.getenv("BOOTSTRAP_ADMIN_USERNAME")

    if not admin_email and not admin_username:
        print("❌ No admin identifier provided.")
        print("   Please set BOOTSTRAP_ADMIN_EMAIL or BOOTSTRAP_ADMIN_USERNAME.")
        return

    db: Session = SessionLocal()
    try:
        query = db.query(User)

        if admin_username:
            user = query.filter(User.username == admin_username).first()
        else:
            user = query.filter(User.email == admin_email).first()

        if not user:
            print("❌ Admin user not found.")
            return

        if user.role != "admin":
            print("❌ The selected user is not an admin.")
            return

        new_password = generate_password()
        user.password_hash = hash_plain_password(new_password)

        db.commit()

        print("✅ Admin password has been reset successfully.")
        print()
        print("🔐 NEW ADMIN PASSWORD")
        print(f"Username: {user.username}")
        print(f"Email:    {user.email}")
        print(f"Password: {new_password}")
        print()
        print("⚠️  Please save this password securely now.")
        print("⚠️  This password will NOT be shown again.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
