from flask import Blueprint, jsonify, session
from models.database import get_db

leaderboard_bp = Blueprint("leaderboard", __name__, url_prefix="/api")


@leaderboard_bp.route("/leaderboard", methods=["GET"])
def get_leaderboard():
    """Возвращает топ-10 игроков и текущий ранг авторизованного пользователя."""
    db = get_db()
    
    cursor = db.execute(
        """
        SELECT username, is_guest, balance
        FROM users
        ORDER BY balance DESC, id ASC
        LIMIT 10
        """
    )
    rows = cursor.fetchall()

    leaders = [
        {
            "rank": idx + 1,
            "username": row["username"],
            "is_guest": bool(row["is_guest"]),
            "balance": row["balance"],
        }
        for idx, row in enumerate(rows)
    ]

    current_user_rank = None
    user_id = session.get("user_id")
    if user_id:
        user_row = db.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
        if user_row:
            user_balance = user_row["balance"]
            higher_count = db.execute(
                "SELECT COUNT(*) as cnt FROM users WHERE balance > ?", (user_balance,)
            ).fetchone()["cnt"]
            current_user_rank = higher_count + 1

    return jsonify({
        "leaders": leaders,
        "current_user_rank": current_user_rank
    }), 200