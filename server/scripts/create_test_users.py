from sqlalchemy import or_

from db.database import SessionLocal
from models.user import User
from auth.security import hash_password


TEST_PASSWORD = "1234"

TEST_USERS = [
    {
        "firstname": "Pablo",
        "lastname": "Publisher",
        "username": "publisher-test",
        "email": "publisher-test@jwco.local",
        "gender": "male",
        "roles": ["publisher"],
    },
    {
        "firstname": "Carla",
        "lastname": "Cartplanner",
        "username": "cartplanner-test",
        "email": "cartplanner-test@jwco.local",
        "gender": "female",
        "roles": ["cartplanner"],
    },
    {
        "firstname": "Felipe",
        "lastname": "Fieldservice",
        "username": "fieldservice-test",
        "email": "fieldservice-test@jwco.local",
        "gender": "male",
        "roles": ["fieldserviceplanner"],
    },
    {
        "firstname": "Tania",
        "lastname": "Talk",
        "username": "talk-assistant-test",
        "email": "talk-assistant-test@jwco.local",
        "gender": "female",
        "roles": ["talk_assistant"],
    },
    {
        "firstname": "Admin",
        "lastname": "Test",
        "username": "admin-test",
        "email": "admin-test@jwco.local",
        "gender": "male",
        "roles": ["admin", "publisher"],
    },
]


def main() -> None:
    db = SessionLocal()
    try:
        created = 0
        skipped = 0

        for data in TEST_USERS:
            existing = (
                db.query(User)
                .filter(
                    or_(
                        User.username == data["username"],
                        User.email == data["email"],
                    )
                )
                .first()
            )
            if existing:
                skipped += 1
                continue

            user = User(
                firstname=data["firstname"],
                lastname=data["lastname"],
                username=data["username"],
                email=data["email"],
                gender=data["gender"],
                roles=data["roles"],
                password_hash=hash_password(TEST_PASSWORD),
                active=True,
            )
            db.add(user)
            created += 1

        db.commit()

        print(f"Created: {created}, Skipped (exists): {skipped}")
        print("Password for all test users:", TEST_PASSWORD)
    finally:
        db.close()


if __name__ == "__main__":
    main()
