import secrets
import re
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, session, g
from werkzeug.security import generate_password_hash, check_password_hash
from models.database import get_db, immediate_transaction

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Простой rate-limiter для создания гостевых аккаунтов по IP в оперативной памяти
_guest_rate_limit_store = {}

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,20}$")


def check_csrf():
    """Проверка CSRF-токена для изменяющих состояние запросов."""
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        client_token = request.headers.get("X-CSRF-Token")
        session_token = session.get("csrf_token")
        if not client_token or not session_token or not secrets.compare_digest(client_token, session_token):
            return jsonify({"error": "CSRF_TOKEN_INVALID", "message": "Недействительный или отсутствующий CSRF-токен."}), 403
    return None


@auth_bp.before_request
def before_request_csrf():
    # Генерация CSRF-токена для сессии, если его нет
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(16)
    
    csrf_error = check_csrf()
    if csrf_error:
        return csrf_error


@auth_bp.route("/session", methods=["GET"])
def get_session():
    """Проверка текущей сессии пользователя."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({
            "authenticated": False,
            "user": None,
            "csrf_token": session.get("csrf_token")
        }), 200

    db = get_db()
    user = db.execute("SELECT id, username, is_guest, balance FROM users WHERE id = ?", (user_id,)).fetchone()
    
    if not user:
        session.clear()
        session["csrf_token"] = secrets.token_hex(16)
        return jsonify({
            "authenticated": False,
            "user": None,
            "csrf_token": session.get("csrf_token")
        }), 200

    return jsonify({
        "authenticated": True,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "is_guest": bool(user["is_guest"]),
            "balance": user["balance"]
        },
        "csrf_token": session.get("csrf_token")
    }), 200


@auth_bp.route("/guest", methods=["POST"])
def guest_auth():
    """Создание или восстановление гостевой сессии с защитой от флуда по IP."""
    existing_user_id = session.get("user_id")
    db = get_db()

    if existing_user_id:
        user = db.execute("SELECT id, username, is_guest, balance FROM users WHERE id = ?", (existing_user_id,)).fetchone()
        if user:
            return jsonify({
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "is_guest": bool(user["is_guest"]),
                    "balance": user["balance"]
                }
            }), 200

    # Защита по IP (не более 3 гостей за 15 минут)
    client_ip = request.remote_addr or "127.0.0.1"
    now_ts = datetime.now(timezone.utc).timestamp()
    
    history = _guest_rate_limit_store.get(client_ip, [])
    history = [ts for ts in history if now_ts - ts < 900]
    
    if len(history) >= 3:
        return jsonify({"error": "RATE_LIMIT_EXCEEDED", "message": "Слишком много запросов на создание гостей с вашего IP."}), 429

    history.append(now_ts)
    _guest_rate_limit_store[client_ip] = history

    # Создание гостя
    guest_suffix = secrets.token_hex(3)
    username = f"Guest_{guest_suffix}"
    initial_balance = 1000

    with immediate_transaction(db):
        cursor = db.execute(
            "INSERT INTO users (username, password_hash, is_guest, balance) VALUES (?, NULL, 1, ?)",
            (username, initial_balance)
        )
        user_id = cursor.lastrowid
        db.execute(
            "INSERT OR IGNORE INTO user_settings (user_id, sound_enabled, animation_speed) VALUES (?, 1, 'normal')",
            (user_id,)
        )

    session.clear()
    session["user_id"] = user_id
    session["csrf_token"] = secrets.token_hex(16)

    return jsonify({
        "user": {
            "id": user_id,
            "username": username,
            "is_guest": True,
            "balance": initial_balance
        }
    }), 201


@auth_bp.route("/register", methods=["POST"])
def register():
    """Регистрация нового пользователя или конвертация гостя."""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not USERNAME_REGEX.match(username):
        return jsonify({"error": "INVALID_USERNAME", "message": "Никнейм должен содержать от 3 до 20 символов (латиница, цифры, _)."}), 400

    if len(password) < 8 or len(password) > 72:
        return jsonify({"error": "INVALID_PASSWORD", "message": "Пароль должен быть от 8 до 72 символов."}), 400

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if existing:
        return jsonify({"error": "USERNAME_TAKEN", "message": "Этот никнейм уже занят."}), 409

    password_hash = generate_password_hash(password)
    current_user_id = session.get("user_id")

    with immediate_transaction(db):
        if current_user_id:
            # Конвертация текущего гостя в постоянный аккаунт
            db.execute(
                "UPDATE users SET username = ?, password_hash = ?, is_guest = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (username, password_hash, current_user_id)
            )
            user_id = current_user_id
        else:
            # Создание нового постоянного аккаунта
            cursor = db.execute(
                "INSERT INTO users (username, password_hash, is_guest, balance) VALUES (?, ?, 0, 1000)",
                (username, password_hash)
            )
            user_id = cursor.lastrowid
            db.execute(
                "INSERT OR IGNORE INTO user_settings (user_id, sound_enabled, animation_speed) VALUES (?, 1, 'normal')",
                (user_id,)
            )

    user_row = db.execute("SELECT id, username, is_guest, balance FROM users WHERE id = ?", (user_id,)).fetchone()

    session.clear()
    session["user_id"] = user_id
    session["csrf_token"] = secrets.token_hex(16)

    return jsonify({
        "user": {
            "id": user_row["id"],
            "username": user_row["username"],
            "is_guest": False,
            "balance": user_row["balance"]
        }
    }), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    """Вход в постоянный аккаунт."""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "MISSING_CREDENTIALS", "message": "Укажите имя пользователя и пароль."}), 400

    db = get_db()
    user = db.execute("SELECT id, username, password_hash, is_guest, balance FROM users WHERE username = ?", (username,)).fetchone()

    if not user or not user["password_hash"] or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "INVALID_CREDENTIALS", "message": "Неверный никнейм или пароль."}), 401

    session.clear()
    session["user_id"] = user["id"]
    session["csrf_token"] = secrets.token_hex(16)

    return jsonify({
        "user": {
            "id": user["id"],
            "username": user["username"],
            "is_guest": False,
            "balance": user["balance"]
        }
    }), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Выход из системы (очистка сессии)."""
    session.clear()
    session["csrf_token"] = secrets.token_hex(16)
    return jsonify({"message": "Выход выполнен успешно.", "csrf_token": session["csrf_token"]}), 200