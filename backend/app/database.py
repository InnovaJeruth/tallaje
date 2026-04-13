import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

# Prioridad: Si existe DATABASE_URL (Render), la usa. 
# Si no, construye la conexión local con los campos del .env
DATABASE_URL = os.getenv("DATABASE_URL")

@contextmanager
def get_conn():
    if DATABASE_URL:
        # Conexión para Render
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    else:
        # Conexión local (la que ya tenías)
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=os.getenv("DB_PORT", "5432"),
            cursor_factory=RealDictCursor
        )
    
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()