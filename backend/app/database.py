import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from dotenv import load_dotenv

# Cargar las variables del archivo .env
load_dotenv()

DB_CONFIG = {
    "dbname":          os.getenv("DB_NAME"),
    "user":            os.getenv("DB_USER"),
    "password":        os.getenv("DB_PASSWORD"),
    "host":            os.getenv("DB_HOST", "127.0.0.1"),
    "port":            os.getenv("DB_PORT", "5432"),
    "client_encoding": "utf8",
}

@contextmanager
def get_conn():
    conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()