import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    """Базовая конфигурация приложения Obsidian Vault."""

    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = ENV == "development"
    TESTING = False

    # Секретный ключ из переменных окружения (с безопасным dev-фоллбэком только для локальной разработки)
    SECRET_KEY = os.getenv("SECRET_KEY") or (
        "dev-only-obsidian-vault-secret-key-change-in-prod" if DEBUG else None
    )

    DATABASE_FILENAME = os.getenv("DATABASE_FILENAME", "obsidian_vault.db")
    DATABASE_PATH = str(BASE_DIR / DATABASE_FILENAME)

    # Безопасность серверных сессионных cookie
    SESSION_COOKIE_NAME = "obsidian_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = ENV == "production"

    # Зафиксированные игровые константы (согласно утверждённой архитектуре)
    INITIAL_BALANCE = 1000
    ALLOWED_BETS = (10, 25, 50, 100, 250, 500)

    FAUCET_THRESHOLD = 100
    FAUCET_AMOUNT = 500
    FAUCET_COOLDOWN_SECONDS = 900  # 15 минут


class TestConfig(Config):
    """Конфигурация для автоматических тестов pytest."""

    TESTING = True
    DEBUG = True
    SECRET_KEY = "test-secret-key-obsidian-vault"