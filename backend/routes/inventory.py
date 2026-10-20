from flask import Blueprint, jsonify, session
from models.database import get_db

inventory_bp = Blueprint("inventory", __name__, url_prefix="/api")


@inventory_bp.route("/inventory", methods=["GET"])
def get_inventory():
    """Возвращает коллекционные предметы пользователя."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "UNAUTHORIZED", "message": "Требуется авторизация."}), 401

    db = get_db()
    cursor = db.execute(
        """
        SELECT i.code, i.name, i.description, i.rarity, ui.quantity
        FROM user_inventory ui
        JOIN items i ON ui.item_id = i.id
        WHERE ui.user_id = ? AND ui.quantity > 0
        """,
        (user_id,),
    )
    
    items = []
    for row in cursor.fetchall():
        items.append({
            "code": row["code"],
            "name": row["name"],
            "description": row["description"],
            "rarity": row["rarity"],
            "quantity": row["quantity"],
        })

    return jsonify({"items": items}), 200