import os
import re
import psycopg
from psycopg_pool import ConnectionPool

TYPE_MAP = {
    "text": "TEXT",
    "integer": "BIGINT",
    "decimal": "NUMERIC(18,4)",
    "boolean": "BOOLEAN",
    "date": "DATE",
    "datetime": "TIMESTAMP",
}

username = os.environ.get("PGUSER", "")
host = os.environ.get("PGHOST", "")
port = os.environ.get("PGPORT", "5432")
database = os.environ.get("PGDATABASE", "databricks_postgres")
password = os.environ.get("PGPASSWORD", "")
sslmode = os.environ.get("PGSSLMODE", "require")

pool = ConnectionPool(
    conninfo=f"dbname={database} user={username} host={host} port={port} password={password} sslmode={sslmode}",
    min_size=1,
    max_size=10,
    open=False,
)


def sanitize_name(name: str) -> str:
    """Sanitize a name for use as SQL identifier (table/column name)."""
    s = name.lower().strip()
    s = re.sub(r"[àáâãä]", "a", s)
    s = re.sub(r"[èéêë]", "e", s)
    s = re.sub(r"[ìíîï]", "i", s)
    s = re.sub(r"[òóôõö]", "o", s)
    s = re.sub(r"[ùúûü]", "u", s)
    s = re.sub(r"[ç]", "c", s)
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    s = re.sub(r"_+", "_", s).strip("_")
    if not s or s[0].isdigit():
        s = "col_" + s
    return s[:63]


def init_schema():
    """Create the metadata tables if they don't exist."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS crud_definitions (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT DEFAULT '',
                    table_name VARCHAR(255) NOT NULL UNIQUE,
                    color VARCHAR(7) DEFAULT '#6366f1',
                    is_favorite BOOLEAN DEFAULT FALSE,
                    is_deleted BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS crud_columns (
                    id SERIAL PRIMARY KEY,
                    crud_id INTEGER NOT NULL REFERENCES crud_definitions(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    db_column VARCHAR(255) NOT NULL,
                    data_type VARCHAR(50) NOT NULL DEFAULT 'text',
                    is_required BOOLEAN DEFAULT FALSE,
                    validation_rule TEXT DEFAULT '',
                    position INTEGER NOT NULL DEFAULT 0,
                    is_deleted BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Migration: add validation_rule if missing on existing tables
            cur.execute("""
                ALTER TABLE crud_columns ADD COLUMN IF NOT EXISTS validation_rule TEXT DEFAULT ''
            """)
            # Validation tools library (auto-growing, reusable across forms)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS validation_tools (
                    id SERIAL PRIMARY KEY,
                    keywords TEXT NOT NULL,
                    rule_example TEXT NOT NULL,
                    tool_name TEXT NOT NULL,
                    code TEXT NOT NULL,
                    usage_count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        conn.commit()


def create_data_table(table_name: str, columns: list[dict]):
    """Create a dynamic data table for a CRUD."""
    col_defs = []
    for col in columns:
        sql_type = TYPE_MAP.get(col["data_type"], "TEXT")
        not_null = "NOT NULL" if col.get("is_required") else ""
        col_defs.append(f'"{col["db_column"]}" {sql_type} {not_null}'.strip())

    cols_sql = ",\n    ".join(col_defs)
    ddl = f"""
        CREATE TABLE IF NOT EXISTS "{table_name}" (
            _id BIGSERIAL PRIMARY KEY,
            {cols_sql},
            _is_deleted BOOLEAN DEFAULT FALSE,
            _created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            _updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
        conn.commit()


def add_column_to_table(table_name: str, db_column: str, data_type: str):
    """Add a column to an existing data table."""
    sql_type = TYPE_MAP.get(data_type, "TEXT")
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{db_column}" {sql_type}')
        conn.commit()


def drop_data_table(table_name: str):
    """Drop a data table (used when no data exists)."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        conn.commit()
