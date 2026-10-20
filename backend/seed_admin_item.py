import sqlite3
from config import Config
from models.database import connect_db
from werkzeug.security import generate_password_hash

def seed_admin_item():
    conn = connect_db(Config.DATABASE_PATH)
    
    with conn:
        # 1. Находим или создаем аккаунт admin
        admin_row = conn.execute("SELECT id FROM users WHERE username = 'admin1'").fetchone()
        if not admin_row:
            print("Создаем аккаунт admin...")
            cursor = conn.execute(
                "INSERT INTO users (username, password_hash, is_guest, balance) VALUES (?, ?, 0, ?)",
                ("admin", generate_password_hash("adminsecure123"), 999999999)
            )
            admin_id = cursor.lastrowid
        else:
            admin_id = admin_row["id"]
            # Насыпаем админу дохуя монет (999 999 999)
            conn.execute("UPDATE users SET balance = 999999999 WHERE id = ?", (admin_id,))
            print("Баланс аккаунта admin обновлен до 999,999,999 монет!")

        # 2. Создаем ультра-редкий предмет в каталоге items, если его еще нет
        item_code = "OBSIDIAN_CROWN_LEGENDARY"
        item_row = conn.execute("SELECT id FROM items WHERE code = ?", (item_code,)).fetchone()
        
        if not item_row:
            cursor = conn.execute(
                """
                INSERT INTO items (code, name, description, rarity)
                VALUES (?, ?, ?, ?)
                """,
                (
                    item_code,
                    "Корона Обсидианового Владыки",
                    "Легендарный артефакт основателя Obsidian Vault. Стоит дороже, чем всё казино вместе взятое.",
                    "legendary"
                )
            )
            item_id = cursor.lastrowid
        else:
            item_id = item_row["id"]

        # 3. Добавляем предмет в инвентарь admin
        conn.execute(
            """
            INSERT INTO user_inventory (user_id, item_id, quantity)
            VALUES (?, ?, 1)
            ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = quantity + 1
            """,
            (admin_id, item_id)
        )
        print("Легендарная 'Корона Обсидианового Владыки' успешно добавлена в инвентарь admin!")

    conn.close()

if __name__ == "__main__":
    seed_admin_item()