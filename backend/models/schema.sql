-- Пользователи (гостевые и зарегистрированные аккаунты)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NULL,
    is_guest INTEGER NOT NULL DEFAULT 1 CHECK(is_guest IN (0, 1)),
    balance INTEGER NOT NULL DEFAULT 1000 CHECK(balance >= 0),
    last_faucet_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- История вращений слота с защитой идемпотентности на уровне пользователя
CREATE TABLE IF NOT EXISTS spin_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    idempotency_key TEXT NOT NULL,
    bet INTEGER NOT NULL CHECK(bet > 0),
    reel_1 TEXT NOT NULL,
    reel_2 TEXT NOT NULL,
    reel_3 TEXT NOT NULL,
    multiplier INTEGER NOT NULL CHECK(multiplier >= 0),
    payout INTEGER NOT NULL CHECK(payout >= 0),
    balance_after INTEGER NOT NULL CHECK(balance_after >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, idempotency_key)
);

-- Каталог коллекционных предметов
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    rarity TEXT NOT NULL CHECK(rarity IN ('common', 'rare', 'epic', 'legendary'))
);

-- Инвентарь пользователей
CREATE TABLE IF NOT EXISTS user_inventory (
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Пользовательские настройки интерфейса
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    sound_enabled INTEGER NOT NULL DEFAULT 1 CHECK(sound_enabled IN (0, 1)),
    animation_speed TEXT NOT NULL DEFAULT 'normal' CHECK(animation_speed IN ('normal', 'fast')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы для быстрых выборок истории и таблицы лидеров
CREATE INDEX IF NOT EXISTS idx_spin_history_user_created ON spin_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_leaderboard ON users(balance DESC, id ASC);