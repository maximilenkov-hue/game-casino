import pytest
import sqlite3
from models.database import connect_db
from services.slot_service import process_spin


@pytest.fixture
def db_conn():
    conn = connect_db(":memory:")
    # Создаём минимальные таблицы для тестов
    conn.executescript(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NULL,
            is_guest INTEGER NOT NULL DEFAULT 1,
            balance INTEGER NOT NULL DEFAULT 1000,
            last_faucet_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE spin_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            idempotency_key TEXT NOT NULL,
            bet INTEGER NOT NULL,
            reel_1 TEXT NOT NULL,
            reel_2 TEXT NOT NULL,
            reel_3 TEXT NOT NULL,
            multiplier INTEGER NOT NULL,
            payout INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE (user_id, idempotency_key)
        );
        """
    )
    conn.execute("INSERT INTO users (id, username, balance) VALUES (1, 'TestPlayer', 1000);")
    yield conn
    conn.close()


def test_process_spin_deducts_and_saves(db_conn):
    key = "test-uuid-1234"
    res1 = process_spin(db_conn, user_id=1, bet=10, idempotency_key=key)

    assert res1["bet"] == 10
    assert res1["balance"] == 1000 - 10 + res1["payout"]
    assert res1["idempotent_replay"] is False

    # Повторный запрос с тем же idempotency_key (идемпотентность)
    res2 = process_spin(db_conn, user_id=1, bet=10, idempotency_key=key)
    assert res2["balance"] == res1["balance"]
    assert res2["idempotent_replay"] is True
    assert res2["reels"] == res1["reels"]


def test_insufficient_funds(db_conn):
    db_conn.execute("UPDATE users SET balance = 5 WHERE id = 1;")
    with pytest.raises(ValueError, match="INSUFFICIENT_FUNDS"):
        process_spin(db_conn, user_id=1, bet=10, idempotency_key="key-999")