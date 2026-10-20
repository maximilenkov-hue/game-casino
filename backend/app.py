import os
from flask import Flask, jsonify
from config import Config
from models.database import close_db, init_db
from routes.auth import auth_bp
from routes.game import game_bp
from routes.leaderboard import leaderboard_bp
from routes.inventory import inventory_bp
from routes.settings import settings_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Автоматическое создание таблиц SQLite при запуске
    with app.app_context():
        init_db()

    # Закрытие соединения с БД в конце каждого запроса
    app.teardown_appcontext(close_db)

    # Регистрация 블루принтов API
    app.register_blueprint(auth_bp)
    app.register_blueprint(game_bp)
    app.register_blueprint(leaderboard_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(settings_bp)

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "NOT_FOUND", "message": "Маршрут не найден."}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "INTERNAL_SERVER_ERROR", "message": "Внутренняя ошибка сервера."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=app.config["DEBUG"])