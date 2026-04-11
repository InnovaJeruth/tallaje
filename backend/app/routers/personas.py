from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_conn

router = APIRouter()


def _borrar_medicion(cur, medicion_id: int) -> None:
    cur.execute("DELETE FROM especiales_detalle WHERE medicion_id = %s", (medicion_id,))
    cur.execute("DELETE FROM mediciones_detalle WHERE medicion_id = %s", (medicion_id,))
    cur.execute("DELETE FROM mediciones WHERE id = %s", (medicion_id,))


class PersonaIn(BaseModel):
    dni: str
    nombre: str


@router.get("/")
def listar_personas(q: str = ""):
    with get_conn() as conn:
        cur = conn.cursor()
        if q:
            cur.execute(
                "SELECT id, dni, nombre, created_at FROM personas "
                "WHERE nombre ILIKE %s OR dni ILIKE %s ORDER BY created_at DESC LIMIT 50",
                (f"%{q}%", f"%{q}%"),
            )
        else:
            cur.execute(
                "SELECT id, dni, nombre, created_at FROM personas ORDER BY created_at DESC LIMIT 50"
            )
        return cur.fetchall()


@router.post("/", status_code=201)
def crear_persona(data: PersonaIn):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO personas (dni, nombre) VALUES (%s, %s) RETURNING id, dni, nombre, created_at",
            (data.dni.strip(), data.nombre.strip()),
        )
        return cur.fetchone()


@router.get("/{persona_id}")
def obtener_persona(persona_id: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, dni, nombre, created_at FROM personas WHERE id = %s", (persona_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return row


@router.delete("/{persona_id}", status_code=204)
def eliminar_persona(persona_id: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM personas WHERE id = %s", (persona_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        cur.execute("SELECT id FROM mediciones WHERE persona_id = %s", (persona_id,))
        for row in cur.fetchall():
            _borrar_medicion(cur, row["id"])
        cur.execute("DELETE FROM personas WHERE id = %s", (persona_id,))


@router.get("/{persona_id}/mediciones")
def mediciones_de_persona(persona_id: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT m.id, m.fecha, m.talla_saco, m.talla_pantalon,
                   m.saco_especial, m.pantalon_especial, m.observaciones
            FROM mediciones m
            WHERE m.persona_id = %s
            ORDER BY m.fecha DESC
            """,
            (persona_id,),
        )
        rows = cur.fetchall()
        out = []
        for row in rows:
            cur.execute(
                """
                SELECT codigo_medida, MAX(valor_cm) AS valor_cm
                FROM mediciones_detalle
                WHERE medicion_id = %s
                GROUP BY codigo_medida
                """,
                (row["id"],),
            )
            medidas = {}
            for r in cur.fetchall():
                v = r["valor_cm"]
                medidas[r["codigo_medida"]] = float(v) if v is not None else None
            item = dict(row)
            item["medidas"] = medidas
            out.append(item)
        return out
