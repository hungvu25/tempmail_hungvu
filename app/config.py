from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://tempmail:tempmail@localhost:5432/tempmail"
    )
    
    # Server
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Storage
    STORAGE_PATH: str = os.getenv("STORAGE_PATH", "./storage")
    ATTACHMENTS_PATH: str = os.getenv("ATTACHMENTS_PATH", "./storage/attachments")
    
    # Inbox settings
    MAX_INBOX_LIFETIME_HOURS: int = int(os.getenv("MAX_INBOX_LIFETIME_HOURS", "24"))
    
    # File limits
    MAX_ATTACHMENT_SIZE_MB: int = int(os.getenv("MAX_ATTACHMENT_SIZE_MB", "5"))
    MAX_EMAIL_SIZE_MB: int = int(os.getenv("MAX_EMAIL_SIZE_MB", "10"))
    
    # Cleanup
    CLEANUP_INTERVAL_MINUTES: int = int(os.getenv("CLEANUP_INTERVAL_MINUTES", "60"))
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()

# Ensure storage directories exist
os.makedirs(settings.ATTACHMENTS_PATH, exist_ok=True)

