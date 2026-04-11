from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_conn

router = APIRouter()


class RangoIn(BaseModel):
    rango_min: float
    rango_max: float
    valor_std: Optional[float] = None


@router.get("/")
def listar_rangos(prenda: Optional[str] = None):
    with get_conn() as conn:
        cur = conn.cursor()
        sql = """
            SELECT p.codigo AS prenda, t.numero AS talla, t.etiqueta, t.orden_num,
                   rt.id, rt.codigo_medida, rt.rango_min, rt.rango_max, rt.valor_std
            FROM rangos_tallaje rt
            JOIN tallas t ON t.id = rt.talla_id
            JOIN prendas p ON p.id = t.prenda_id
        """
        params = []
        if prenda:
            sql += " WHERE p.codigo = %s"
            params.append(prenda.upper())
        sql += " ORDER BY p.codigo, t.orden_num, rt.codigo_medida"
        cur.execute(sql, params)
        return cur.fetchall()


@router.put("/{rango_id}")
def actualizar_rango(rango_id: int, data: RangoIn):
    if data.rango_min > data.rango_max:
        raise HTTPException(status_code=400, detail="rango_min no puede ser mayor que rango_max")
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE rangos_tallaje
               SET rango_min = %s, rango_max = %s, valor_std = %s, updated_at = NOW()
             WHERE id = %s
            RETURNING id, codigo_medida, rango_min, rango_max, valor_std
            """,
            (data.rango_min, data.rango_max, data.valor_std, rango_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Rango no encontrado")
    return row