from sqlalchemy import text

from db.database import engine


def main() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE carts
                ADD COLUMN IF NOT EXISTS color VARCHAR
                """
            )
        )
    print("OK: carts.color column ensured")


if __name__ == "__main__":
    main()
