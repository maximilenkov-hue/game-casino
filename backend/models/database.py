import sqlite3
from contextlib import contextmanager
from pathlib import Path
from flask import current_app, g

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def connect_db(db_path: str) -> sqlite3.Connection:
    """Создаёт соединение с SQLite с поддержкой Row и проверкой внешних ключей."""
    conn = sqlite3.connect(
        db_path,
        timeout=10.0,
        isolation_level=None,  # Ручное управление транзакциями (autocommit вне BEGIN)
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


def get_db() -> sqlite3.Connection:
    """Возвращает соединение с БД для текущего контекста Flask-приложения."""
    if "db" not in g:
        db_path = current_app.config["DATABASE_PATH"]
        g.db = connect_db(db_path)
    return g.db


def close_db(exception=None) -> None:
    """Закрывает соединение с БД в конце запроса."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(db_path: str | None = None) -> None:
    """Безопасно создаёт таблицы и индексы из schema.sql, если их ещё нет."""
    target_path = db_path or current_app.config["DATABASE_PATH"]
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn = connect_db(target_path)
    try:
        conn.executescript(schema_sql)
    finally:
        conn.close()


@contextmanager
def immediate_transaction(conn: sqlite3.Connection):
    """
    Выполняет блок кода внутри атомарной транзакции BEGIN IMMEDIATE.
    Гарантирует блокировку на запись с самого начала транзакции и защиту от гонок.
    """
    conn.execute("BEGIN IMMEDIATE;")
    try:
        yield conn
        conn.execute("COMMIT;")
    except Exception:
        conn.execute("ROLLBACK;")
        raise