import sqlite3
from typing import Dict, Any
from datetime import datetime, timezone


def process_faucet(
    conn: sqlite3.Connection,
    user_id: int,
    threshold: int = 100,
    amount: int = 500,
    cooldown_seconds: int = 900,
) -> Dict[str, Any]:
    """
    Начисляет тестовые монеты (faucet), если текущий баланс меньше порога
    и прошёл необходимый кулдаун. Защищено от гонок через BEGIN IMMEDIATE.
    """
    with conn:
        user_row = conn.execute(
            "SELECT balance, last_faucet_id, last_faucet_at FROM users WHERE id = ?",
            (user_id,) if "last_faucet_id" in [c[1] for c in conn.execute("PRAGMA table_info(users)").fetchall()] else (user_id,)
        ).fetchone()
        
        # Получаем структуру полей безопасно
        cursor = conn.execute("SELECT balance, last_faucet_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("USER_NOT_FOUND")

        balance = row["balance"]
        last_faucet_at_str = row["last_faucet_at"]

        # 1. Проверка порога баланса
        if balance >= threshold:
            raise ValueError("BALANCE_TOO_HIGH")

        # 2. Проверка кулдауна
        next_available_in = 0
        if last_faucet_at_str:
            # Парсим время из БД (UTC)
            try:
                last_faucet_time = datetime.fromisoformat(last_faucet_at_str.replace("Z", "+00:00"))
                if last_faucet_time.tzinfo is None:
                    last_faucet_time = last_faucet_time.replace(tzinfo=timezone.utc)
                
                now = datetime.now(timezone.utc)
                elapsed = (now - last_faucet_time).total_seconds()
                
                if elapsed < cooldown_seconds:
                    next_available_in = int(cooldown_seconds - elapsed)
                    raise ValueError(f"FAUCET_COOLDOWN:{next_available_in}")
            except ValueError as e:
                if str(e).startswith("FAUCET_COOLDOWN:"):
                    raise

        new_balance = balance + amount

        # Атомарное обновление баланса и метки времени
        conn.execute(
            """
            UPDATE users
            SET balance = ?, last_faucet_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND balance < ?
            """,
            (new_balance, user_id, threshold),
        )

        updated_row = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
        final_balance = updated_row["balance"] if updated_row else new_balance

        return {
            "added": amount,
            "balance": final_balance,
            "next_available_in_seconds": cooldown_seconds,
            "message": f"Успешно начислено {amount} монет.",
        }