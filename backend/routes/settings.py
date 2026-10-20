from flask import Blueprint, request, jsonify, session
from models.database import get_db, immediate_transaction

settings_bp = Blueprint("settings", __name__, url_prefix="/api")


@settings_bp.route("/settings", methods=["GET"])
def get_settings():
    """Получение настроек интерфейса пользователя."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "UNAUTHORIZED", "message": "Требуется авторизация."}), 401

    db = get_db()
    row = db.execute("SELECT sound_enabled, animation_speed FROM user_settings WHERE user_id = ?", (user_id,)).fetchone()
    
    if not row:
        db.execute(
            "INSERT OR IGNORE INTO user_settings (user_id, sound_enabled, animation_speed) VALUES (?, 1, 'normal')",
            (user_id,)
        )
        row = {"sound_enabled": 1, "animation_speed": "normal"}

    return jsonify({
        "settings": {
            "sound_enabled": bool(row["sound_enabled"]),
            "animation_speed": row["animation_speed"]
        }
    }), 200


@settings_bp.route("/settings", methods=["PUT"])
def update_settings():
    """Обновление настроек интерфейса пользователя."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "UNAUTHORIZED", "message": "Требуется авторизация."}), 401

    data = request.get_json() or {}
    sound_enabled = data.get("sound_enabled")
    animation_speed = data.get("animation_speed")

    if sound_enabled is not None and not isinstance(sound_enabled, bool):
        return jsonify({"error": "INVALID_SOUND", "message": "Параметр sound_enabled должен быть логическим."}), 400

    if animation_speed is not None and animation_speed not in ("normal", "fast"):
        return jsonify({"error": "INVALID_SPEED", "message": "Допустимые скорости анимации: normal, fast."}), 400

    db = get_db()
    
    current = db.execute("SELECT sound_enabled, animation_speed FROM user_settings WHERE user_id = ?", (user_id,)).fetchone()
    if not current:
        db.execute(
            "INSERT OR IGNORE INTO user_settings (user_id, sound_enabled, animation_speed) VALUES (?, 1, 'normal')",
            (user_id,)
        )
        current = {"sound_enabled": 1, "animation_speed": "normal"}

    new_sound = 1 if sound_enabled is None else (1 if sound_enabled else 0)
    new_speed = animation_speed if animation_speed is not None else current["animation_speed"]

    with immediate_transaction(db):
        db.execute(
            "INSERT INTO user_settings (user_id, sound_enabled, animation_speed) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET sound_enabled = excluded.sound_enabled, animation_speed = excluded.animation_speed",
            (user_id, new_sound, new_speed)
        )

    return jsonify({
        "settings": {
            "sound_enabled": bool(new_sound),
            "animation_speed": new_speed
        }
    }), 200