from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Datenbank
    database_url: str = Field(..., alias="DATABASE_URL")

    # JWT / Security
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Bootstrap Admin
    bootstrap_admin_email: str | None = Field(
        default=None, alias="BOOTSTRAP_ADMIN_EMAIL"
    )
    bootstrap_admin_name: str | None = Field(
        default=None, alias="BOOTSTRAP_ADMIN_NAME"
    )
    bootstrap_admin_enabled: bool = Field(
        default=False, alias="BOOTSTRAP_ADMIN_ENABLED"
    )

    class Config:
        env_file = ".env"
        extra = "forbid"  # <-- das ist gut so, behalten!


settings = Settings()
