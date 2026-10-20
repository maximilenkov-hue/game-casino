import random
import sqlite3
from typing import Dict, Any

# Веса символов (сумма = 100)
REEL_WEIGHTS = [
    ("SEVEN", 5),
    ("DIAMOND", 10),
    ("CROWN", 15),
    ("STAR", 20),
    ("BELL", 25),
    ("CHERRY", 25),
]

# Таблица множителей выплат
THREE_OF_A_KIND_MULTIPLIERS = {
    "SEVEN": 100,
    "DIAMOND": 40,
    "CROWN": 20,
    "STAR": 12,
    "BELL": 8,
    "CHERRY": 5,
}


def spin_single_reel() -> str:
    """Выбирает один символ на барабане в соответствии с его весом."""
    roll = random.randint(1, 100)
    cumulative = 0
    for symbol, weight in REEL_WEIGHTS:
        cumulative += weight
        if roll <= cumulative:
            return symbol
    return "CHERRY"


def evaluate_spin_result(reels: list[str], bet: int) -> Dict[str, int]:
    """Рассчитывает множитель и выплату по выпавшей комбинации."""
    r1, r2, r3 = reels

    # 1. Три одинаковых символа
    if r1 == r2 and r2 == r3:
        multiplier = THREE_OF_A_KIND_MULTIPLIERS.get(r1, 0)
        return {"multiplier": multiplier, "payout": bet * multiplier}

    # Подсчёт частоты символов
    counts: Dict[str, int] = {}
    for sym in reels:
        counts[sym] = counts.get(sym, 0) + 1

    # 2. Ровно две BELL (x2)
    if counts.get("BELL", 0) == 2:
        return {"multiplier": 2, "payout": bet * 2}

    # 3. Ровно две STAR или ровно две CHERRY (x1)
    if counts.get("STAR", 0) == 2 or counts.get("CHERRY", 0) == 2:
        return {"multiplier": 1, "payout": bet * 1}

    # 4. Остальные комбинации (x0)
    return {"multiplier": 0, "payout": 0}


def process_spin(conn: sqlite3.Connection, user_id: int, bet: int, idempotency_key: str) -> Dict[str, Any]:
    """
    Выполняет вращение барабанов в рамках атомарной транзакции BEGIN IMMEDIATE.
    Защищено от повторных запросов с тем же idempotency_key для данного пользователя.
    """
    with conn:
        # Проверка существующего запроса с тем же idempotency_key
        cursor = conn.execute(
            """
            SELECT id, reel_1, reel_2, reel_3, multiplier, payout, balance_after, created_at
            FROM spin_history
            WHERE user_id = ? AND idempotency_key = ?
            """,
            (user_id, idempotency_key),
        )
        existing = cursor.fetchone()
        if existing:
            # Идемпотентный возврат ранее сохранённого результата
            user_row = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
            current_balance = user_row["balance"] if user_row else existing["balance_after"]
            return {
                "reels": [existing["reel_1"], existing["reel_2"], existing["reel_3"]],
                "bet": bet,
                "multiplier": existing["multiplier"],
                "payout": existing["payout"],
                "balance": current_balance,
                "idempotency_key": idempotency_key,
                "idempotent_replay": True,
            }

        # Получение актуального баланса пользователя с блокировкой строки
        user_row = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user_row:
            raise ValueError("USER_NOT_FOUND")

        current_balance = user_row["balance"]
        if current_balance < bet:
            raise ValueError("INSUFFICIENT_FUNDS")

        # Генерация результата вращения
        reels = [spin_single_reel(), spin_single_reel(), spin_single_reel()]
        calc = evaluate_spin_result(reels, bet)
        multiplier = calc["multiplier"]
        payout = calc["payout"]

        # Новый баланс: списание ставки + начисление выигрыша
        balance_after = current_balance - bet + payout

        # Атомарное обновление баланса пользователя
        conn.execute(
            """
            UPDATE users
            SET balance = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (balance_after, user_id),
        )

        # Запись в историю вращений
        conn.execute(
            """
            INSERT INTO spin_history (user_id, idempotency_key, bet, reel_1, reel_2, reel_3, multiplier, payout, balance_after)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, idempotency_key, bet, reels[0], reels[1], reels[2], multiplier, payout, balance_after),
        )

        return {
            "reels": reels,
            "bet": bet,
            "multiplier": multiplier,
            "payout": payout,
            "balance": balance_after,
            "idempotency_key": idempotency_key,
            "idempotent_replay": False,
        }