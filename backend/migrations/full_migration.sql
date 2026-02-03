INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Generating static SQL
INFO  [alembic.runtime.migration] Will assume transactional DDL.
BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

INFO  [alembic.runtime.migration] Running upgrade  -> 4164e996f218, initial schema
-- Running upgrade  -> 4164e996f218

CREATE TABLE achievements (
    id SERIAL NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    description VARCHAR(255) NOT NULL, 
    icon VARCHAR(100), 
    xp_reward INTEGER NOT NULL, 
    category VARCHAR(50) NOT NULL, 
    requirement_type VARCHAR(50) NOT NULL, 
    requirement_value INTEGER NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (id), 
    CONSTRAINT ck_requirement_value CHECK (requirement_value > 0), 
    CONSTRAINT ck_xp_reward_amount CHECK (xp_reward >= 0), 
    UNIQUE (name)
);

CREATE INDEX idx_achievements_category ON achievements (category);

CREATE INDEX idx_achievements_name ON achievements (name);

CREATE TABLE users (
    id SERIAL NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    hashed_password VARCHAR(255) NOT NULL, 
    username VARCHAR(50), 
    total_xp INTEGER DEFAULT 0 NOT NULL, 
    current_level INTEGER DEFAULT 0 NOT NULL, 
    current_streak INTEGER DEFAULT 0 NOT NULL, 
    longest_streak INTEGER DEFAULT 0 NOT NULL, 
    last_activity_date TIMESTAMP WITHOUT TIME ZONE, 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT ck_users_total_xp_non_negative CHECK (total_xp >= 0), 
    UNIQUE (email), 
    UNIQUE (hashed_password)
);

CREATE INDEX idx_users_email ON users (email);

CREATE INDEX idx_users_username ON users (username);

CREATE TABLE budgets (
    id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    category VARCHAR(50) NOT NULL, 
    monthly_limit DECIMAL(10, 2) NOT NULL, 
    current_spent DECIMAL(10, 2) DEFAULT 0, 
    last_reset_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT ck_current_spent_amount CHECK (current_spent >= 0), 
    CONSTRAINT ck_monthly_limit_amount CHECK (monthly_limit > 0), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    CONSTRAINT unique_budget_user_category UNIQUE (user_id, category)
);

CREATE INDEX idx_budgets_category ON budgets (category);

CREATE INDEX idx_budgets_user_id ON budgets (user_id);

CREATE TABLE transactions (
    id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    amount DECIMAL(10, 2) NOT NULL, 
    category VARCHAR(50) NOT NULL, 
    type VARCHAR(10) NOT NULL, 
    description VARCHAR(255), 
    date TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT ck_transaction_type CHECK (type IN ('income', 'expense')), 
    CONSTRAINT ck_transaction_amount CHECK (amount > 0), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_category ON transactions (category);

CREATE INDEX idx_transactions_date ON transactions (date);

CREATE INDEX idx_transactions_user_date ON transactions (user_id, date DESC);

CREATE INDEX idx_transactions_user_id ON transactions (user_id);

INSERT INTO alembic_version (version_num) VALUES ('4164e996f218') RETURNING alembic_version.version_num;

INFO  [alembic.runtime.migration] Running upgrade 4164e996f218 -> 70bc791625a3, fix timezone aware timstamps
-- Running upgrade 4164e996f218 -> 70bc791625a3

ALTER TABLE achievements ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE budgets ALTER COLUMN last_reset_date TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE budgets ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE budgets ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE transactions ALTER COLUMN date TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE transactions ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE transactions ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE users ALTER COLUMN last_activity_date TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE users ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

UPDATE alembic_version SET version_num='70bc791625a3' WHERE alembic_version.version_num = '4164e996f218';

COMMIT;

