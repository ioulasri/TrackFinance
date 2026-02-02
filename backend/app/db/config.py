import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    debug: bool = True

    api_host: str = "0.0.0.0"
    api_port: int = 8080

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra='ignore',
    )

settings = Settings()
