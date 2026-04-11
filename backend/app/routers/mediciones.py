from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_conn
from app.calcular_talla import calcular_talla_saco, calcular_talla_pantalon

router = APIRouter()


class MedicionIn(BaseModel):
    persona_id: int
    pecho: float
    cintura: float
    cadera: float
    largo_manga: float
    largo_pantalon: float
    observaciones: Optional[str] = None


@router.post("/", status_code=201)
def crear_medicion(data: MedicionIn):
    medidas_saco = {
        "PECHO":       data.pecho,
        "CINTURA":     data.cintura,
        "CADERA":      data.cadera,
        "LARGO_MANGA": data.largo_manga,
    }
    medidas_pantalon = {
        "CINTURA": data.cintura,
        "CADERA":  data.cadera,
        "LARGO":   data.largo_pantalon,
    }

    res_saco     = calcular_talla_saco(medidas_saco)
    res_pantalon = calcular_talla_pantalon(medidas_pantalon)

    with get_conn() as conn:
        cur = conn.cursor()

        # Verificar persona
        cur.execute("SELECT id FROM personas WHERE id = %s", (data.persona_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Persona no encontrada")

        # Obtener prenda IDs
        cur.execute("SELECT id, codigo FROM prendas WHERE codigo IN ('SACO','PANTALON')")
        prendas = {r["codigo"]: r["id"] for r in cur.fetchall()}

        # Insertar cabecera medición
        cur.execute(
            """
            INSERT INTO mediciones
                (persona_id, talla_saco, talla_pantalon,
                 saco_especial, pantalon_especial, observaciones)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, fecha
            """,
            (
                data.persona_id,
                res_saco["talla"],
                res_pantalon["talla"],
                res_saco["especial"],
                res_pantalon["especial"],
                data.observaciones,
            ),
        )
        med = cur.fetchone()
        medicion_id = med["id"]

        # Insertar detalle SACO
        _insertar_detalle(cur, medicion_id, prendas["SACO"], medidas_saco)
        # Insertar detalle PANTALON
        _insertar_detalle(cur, medicion_id, prendas["PANTALON"], medidas_pantalon)

        # Insertar especiales SACO
        if res_saco["especial"] and res_saco["especiales_detalle"]:
            _insertar_especiales(cur, medicion_id, prendas["SACO"],
                                 res_saco["talla"], res_saco["especiales_detalle"])

        # Insertar especiales PANTALON
        if res_pantalon["especial"] and res_pantalon["especiales_detalle"]:
            _insertar_especiales(cur, medicion_id, prendas["PANTALON"],
                                 res_pantalon["talla"], res_pantalon["especiales_detalle"])

    return {
        "medicion_id":   medicion_id,
        "persona_id":    data.persona_id,
        "fecha":         med["fecha"],
        "saco":          res_saco,
        "pantalon":      res_pantalon,
    }


def _borrar_medicion_por_id(cur, medicion_id: int) -> bool:
    cur.execute("SELECT id FROM mediciones WHERE id = %s", (medicion_id,))
    if not cur.fetchone():
        return False
    cur.execute("DELETE FROM especiales_detalle WHERE medicion_id = %s", (medicion_id,))
    cur.execute("DELETE FROM mediciones_detalle WHERE medicion_id = %s", (medicion_id,))
    cur.execute("DELETE FROM mediciones WHERE id = %s", (medicion_id,))
    return True


@router.delete("/{medicion_id}", status_code=204)
def eliminar_medicion(medicion_id: int):
    with get_conn() as conn:
        cur = conn.cursor()
        if not _borrar_medicion_por_id(cur, medicion_id):
            raise HTTPException(status_code=404, detail="Medición no encontrada")


@router.get("/{medicion_id}")
def obtener_medicion(medicion_id: int):
    with get_conn() as conn:
        cur = conn.cursor()

        cur.execute("""
            SELECT m.id, m.fecha, m.observaciones,
                   m.talla_saco, m.talla_pantalon,
                   m.saco_especial, m.pantalon_especial,
                   p.nombre AS persona_nombre, p.dni
            FROM mediciones m
            JOIN personas p ON p.id = m.persona_id
            WHERE m.id = %s
        """, (medicion_id,))
        med = cur.fetchone()
        if not med:
            raise HTTPException(status_code=404, detail="Medición no encontrada")

        cur.execute("""
            SELECT pr.codigo AS prenda, md.codigo_medida, md.valor_cm
            FROM mediciones_detalle md
            JOIN prendas pr ON pr.id = md.prenda_id
            WHERE md.medicion_id = %s
        """, (medicion_id,))
        detalle = cur.fetchall()

        cur.execute("""
            SELECT pr.codigo AS prenda, ed.*
            FROM especiales_detalle ed
            JOIN prendas pr ON pr.id = ed.prenda_id
            WHERE ed.medicion_id = %s
        """, (medicion_id,))
        especiales = cur.fetchall()

    return {"medicion": med, "detalle": detalle, "especiales": especiales}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _insertar_detalle(cur, medicion_id, prenda_id, medidas: dict):
    for codigo, valor in medidas.items():
        cur.execute(
            """
            INSERT INTO mediciones_detalle (medicion_id, prenda_id, codigo_medida, valor_cm)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (medicion_id, prenda_id, codigo_medida) DO UPDATE SET valor_cm = EXCLUDED.valor_cm
            """,
            (medicion_id, prenda_id, codigo, valor),
        )


def _insertar_especiales(cur, medicion_id, prenda_id, talla_asignada, detalles: list):
    # Medidas fuera de tabla: talla puede ser None; la BD exige NOT NULL en talla_asignada
    talla_db = talla_asignada if talla_asignada is not None else "?"
    for d in detalles:
        # fuera_de_tabla puede traer diferencia_cm None; la columna suele ser NOT NULL
        diff = d.get("diferencia_cm")
        diff_cm = 0.0 if diff is None else float(diff)
        # fuera_de_tabla: sin rango en tabla; la BD puede exigir NOT NULL en min/max
        rmin = d.get("rango_esperado_min")
        rmax = d.get("rango_esperado_max")
        rango_min = 0.0 if rmin is None else float(rmin)
        rango_max = 0.0 if rmax is None else float(rmax)
        cur.execute(
            """
            INSERT INTO especiales_detalle
                (medicion_id, prenda_id, talla_asignada, codigo_medida_fuera,
                 diferencia_cm, valor_real_cm, rango_esperado_min, rango_esperado_max)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                medicion_id,
                prenda_id,
                talla_db,
                d["codigo_medida_fuera"],
                diff_cm,
                d["valor_real_cm"],
                rango_min,
                rango_max,
            ),
        )
