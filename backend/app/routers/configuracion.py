from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_conn

router = APIRouter()


class ConfigIn(BaseModel):
    valor: str


@router.get("/")
def listar_config():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT clave, valor, descripcion, updated_at FROM configuracion ORDER BY clave")
        return cur.fetchall()


@router.put("/{clave}")
def actualizar_config(clave: str, data: ConfigIn):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE configuracion SET valor = %s, updated_at = NOW()
            WHERE clave = %s
            RETURNING clave, valor, descripcion, updated_at
            """,
            (data.valor.strip(), clave),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Clave de configuración no encontrada")
    return row
