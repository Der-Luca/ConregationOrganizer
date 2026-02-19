from sqlalchemy import text

from db.database import engine


def main() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE talk_upload_links
                ADD COLUMN IF NOT EXISTS upload_token VARCHAR,
                ADD COLUMN IF NOT EXISTS upload_token_expires_at TIMESTAMPTZ
                """
            )
        )
    print("OK: talk_upload_links columns ensured")


if __name__ == "__main__":
    main()
