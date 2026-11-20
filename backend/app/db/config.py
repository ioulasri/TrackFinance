import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator

class Settings(BaseSettings):
    database_url: str
    database_migration_url: str | None = None
    debug: bool = False

    api_host: str = "0.0.0.0"
    api_port: int = 8080

    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    @model_validator(mode="after")
    def validate_production_secret(self):
        if os.getenv("VERCEL") and os.getenv("TESTING") != "1":
            if len(self.secret_key) < 32 or self.secret_key == "your-secret-key-change-in-production":
                raise ValueError("Set SECRET_KEY to a random secret of at least 32 characters on Vercel")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra='ignore',
        hide_input_in_errors=True,
    )

settings = Settings()
