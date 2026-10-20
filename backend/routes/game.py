from flask import Blueprint, request, jsonify, session
from models.database import get_db, immediate_transaction
from services.slot_service import process_spin
from services.balance_service import process_faucet

game_bp = Blueprint("game", __name__, url_prefix="/api/game")


def require_auth():
    """Проверка наличия авторизованного пользователя в сессии."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    db = get_db()
    return db.execute("SELECT id, balance FROM users WHERE id = ?", (user_id,)).fetchone()


@game_bp.route("/spin", methods=["POST"])
def spin():
    """Обработка вращения слота."""
    user = require_auth()
    if not user:
        return jsonify({"error": "UNAUTHORIZED", "message": "Требуется авторизация."}), 401

    data = request.get_json() or {}
    bet = data.get("bet")
    idempotency_key = data.get("idempotency_key")

    if not isinstance(bet, int) or bet not in (10, 25, 50, 100, 250, 500):
        return jsonify({"error": "INVALID_BET", "message": "Недопустимый размер ставки."}), 400

    if not isinstance(idempotency_key, str) or not (8 <= len(idempotency_key) <= 64):
        return jsonify({"error": "INVALID_IDEMPOTENCY_KEY", "message": "Отсутствует или некорректен ключ идемпотентности."}), 400

    db = get_db()
    try:
        result = process_spin(db, user_id=user["id"], bet=bet, idempotency_key=idempotency_key)
        return jsonify(result), 200
    except ValueError as e:
        err_msg = str(e)
        if err_msg == "INSUFFICIENT_FUNDS":
            return jsonify({"error": "INSUFFICIENT_FUNDS", "message": "Недостаточно монет для ставки."}), 409
        elif err_msg == "USER_NOT_FOUND":
            return jsonify({"error": "USER_NOT_FOUND", "message": "Пользователь не найден."}), 404
        return jsonify({"error": "BAD_REQUEST", "message": err_msg}), 400


@game_bp.route("/history", methods=["GET"])
def history():
    """Получение истории вращений текущего пользователя."""
    user = require_auth()
    if not user:
        return jsonify({"error": "UNAUTHORIZED", "message": "Требуется авторизация."}), 401

    limit = request.args.get("limit", 20, type=int)
    limit = max(1, min(limit, 50))

    db = get_db()
    cursor = db.execute(
        """
        SELECT id, bet, reel_1, reel_2, reel_3, multiplier, payout, balance_after, created_at
        FROM spin_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user["id"], limit),
    )
    rows = cursor.fetchall()

    history_list = [
        {
            "id": row["id"],
            "bet": row["bet"],
            "reels": [row["reel_1"], row["reel_2"], row["reel_3"]],
            "multiplier": row["multiplier"],
            "payout": row["payout"],
            "balance_after": row["balance_after"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]

    return jsonify({"history": history_list}), 200


@game_bp.route("/faucet", methods=["POST"])
def faucet():
    """Пополнение тестового баланса (+500 монет при балансе < 100)."""
    user = require_auth()
    if not user:
        return jsonify({"error": "UNAUTHORIZED", "message": "Требуется авторизация."}), 401

    db = get_db()
    try:
        # threshold=100, amount=500, cooldown=900 сек (15 минут)
        result = process_faucet(db, user_id=user["id"], threshold=100, amount=500, cooldown_seconds=900)
        return jsonify(result), 200
    except ValueError as e:
        err_msg = str(e)
        if err_msg == "BALANCE_TOO_HIGH":
            return jsonify({"error": "BALANCE_TOO_HIGH", "message": "Пополнение доступно только при балансе меньше 100 монет."}), 400
        if err_msg.startswith("FAUCET_COOLDOWN:"):
            cooldown_left = int(err_msg.split(":")[1])
            return jsonify({
                "error": "FAUCET_COOLDOWN",
                "message": f"Пополнение будет доступно через {cooldown_left} сек.",
                "next_available_in_seconds": cooldown_left
            }), 429
        return jsonify({"error": "BAD_REQUEST", "message": err_msg}), 400