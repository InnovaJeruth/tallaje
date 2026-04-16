from fastapi import APIRouter
from app.database import get_conn

router = APIRouter()


@router.get("/tallas")
def reporte_tallas():
    with get_conn() as conn:
        cur = conn.cursor()

        cur.execute("SELECT valor FROM configuracion WHERE clave = 'tolerancia_largo_cm'")
        row = cur.fetchone()
        tolerancia_largo = float(row["valor"]) if row else 1.0

        result = {}

        for prenda_cod, medida_largo in [("SACO", "LARGO_MANGA"), ("PANTALON", "LARGO")]:

            # ── Normales ───────────────────────────────────────────────────
            if prenda_cod == "SACO":
                cur.execute("""
                    SELECT m.talla_saco AS talla, t.etiqueta, COUNT(*) AS cantidad
                    FROM mediciones m
                    JOIN tallas t ON t.numero = m.talla_saco
                    JOIN prendas p ON p.id = t.prenda_id
                    WHERE m.talla_saco IS NOT NULL AND m.saco_especial = FALSE
                    AND p.codigo = 'SACO'
                    GROUP BY m.talla_saco, t.etiqueta
                    ORDER BY MIN(t.orden_num)                    
                """)
            else:
                cur.execute("""
                    SELECT m.talla_pantalon AS talla, t.etiqueta, COUNT(*) AS cantidad
                    FROM mediciones m
                    JOIN tallas t ON t.numero = m.talla_pantalon
                    JOIN prendas p ON p.id = t.prenda_id
                    WHERE m.talla_pantalon IS NOT NULL AND m.pantalon_especial = FALSE
                    AND p.codigo = 'PANTALON'
                    GROUP BY m.talla_pantalon, t.etiqueta
                    ORDER BY MIN(t.orden_num)                    
                """)
            tallas_normales = cur.fetchall()

            tallas_con_largos = []
            for fila in tallas_normales:
                talla = fila["talla"]
                cant  = fila["cantidad"]

                cur.execute("""
                    SELECT rt.valor_std
                    FROM rangos_tallaje rt
                    JOIN tallas t ON t.id = rt.talla_id
                    JOIN prendas p ON p.id = t.prenda_id
                    WHERE p.codigo = %s AND t.numero = %s AND rt.codigo_medida = %s
                """, (prenda_cod, talla, medida_largo))
                std_row   = cur.fetchone()
                largo_std = float(std_row["valor_std"]) if std_row and std_row["valor_std"] else None

                if prenda_cod == "SACO":
                    talla_filter = "m.talla_saco = %s AND m.saco_especial = FALSE"
                else:
                    talla_filter = "m.talla_pantalon = %s AND m.pantalon_especial = FALSE"

                cur.execute(f"""
                    SELECT md.valor_cm AS largo
                    FROM mediciones_detalle md
                    JOIN mediciones m ON m.id = md.medicion_id
                    JOIN prendas p ON p.id = md.prenda_id
                    WHERE {talla_filter}
                      AND p.codigo = %s
                      AND md.codigo_medida = %s
                """, (talla, prenda_cod, medida_largo))

                grupos_largo = _agrupar_largos(
                    [float(r["largo"]) for r in cur.fetchall()],
                    tolerancia_largo
                )

                tallas_con_largos.append({
                    "talla":        talla,
                    "etiqueta":     fila["etiqueta"],
                    "cantidad":     cant,
                    "largo_std":    largo_std,
                    "grupos_largo": grupos_largo,
                })

            # ── Especiales ─────────────────────────────────────────────────
            cur.execute("""
                SELECT per.nombre, per.dni,
                       ed.talla_asignada,
                       ed.codigo_medida_fuera,
                       ed.diferencia_cm,
                       ed.valor_real_cm,
                       ed.rango_esperado_min,
                       ed.rango_esperado_max,
                       md_largo.valor_cm AS largo
                FROM especiales_detalle ed
                JOIN mediciones m ON m.id = ed.medicion_id
                JOIN personas per ON per.id = m.persona_id
                JOIN prendas p ON p.id = ed.prenda_id
                LEFT JOIN mediciones_detalle md_largo
                    ON md_largo.medicion_id = m.id
                    AND md_largo.prenda_id = ed.prenda_id
                    AND md_largo.codigo_medida = %s
                WHERE p.codigo = %s
                ORDER BY ed.talla_asignada, ed.diferencia_cm
            """, (medida_largo, prenda_cod))

            grupos_especiales = _agrupar_especiales(cur.fetchall())

            result[prenda_cod] = {
                "tallas":            tallas_con_largos,
                "grupos_especiales": grupos_especiales,
            }

    return result


@router.get("/resumen")
def resumen():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS total FROM personas")
        total_personas = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) AS total FROM mediciones")
        total_mediciones = cur.fetchone()["total"]

        cur.execute("""
            SELECT COUNT(*) AS total FROM mediciones
            WHERE saco_especial = TRUE OR pantalon_especial = TRUE
        """)
        total_especiales = cur.fetchone()["total"]

    return {
        "total_personas":   total_personas,
        "total_mediciones": total_mediciones,
        "total_especiales": total_especiales,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _agrupar_largos(largos: list, tolerancia: float) -> list:
    if not largos:
        return []
    largos_sorted = sorted(largos)
    grupos = []
    visitados = [False] * len(largos_sorted)
    for i, l in enumerate(largos_sorted):
        if visitados[i]:
            continue
        grupo = [l]
        visitados[i] = True
        for j in range(i + 1, len(largos_sorted)):
            if not visitados[j] and abs(largos_sorted[j] - l) <= tolerancia:
                grupo.append(largos_sorted[j])
                visitados[j] = True
        grupos.append({
            "centro":   round(sum(grupo) / len(grupo), 1),
            "cantidad": len(grupo),
        })
    return grupos


def _agrupar_especiales(rows: list) -> list:
    """
    Agrupa especiales:
    1. Por talla_asignada
    2. Dentro de cada talla y medida, por diferencia_cm con tolerancia ±1cm

    Retorna:
    [
      {
        "talla_asignada": "38",
        "grupos": [
          {
            "medida_fuera": "PECHO",
            "diferencia_centro": 5.0,
            "cantidad": 3,
            "personas": [{nombre, dni, diferencia_cm, largo}, ...]
          }
        ]
      }
    ]
    """
    if not rows:
        return []

    tolerancia = 1.0

    # Agrupar por talla_asignada
    por_talla = {}
    for r in rows:
        talla = r["talla_asignada"] or "FUERA"
        if talla not in por_talla:
            por_talla[talla] = []
        por_talla[talla].append(r)

    resultado = []

    for talla, personas in por_talla.items():
        # Separar por medida_fuera
        por_medida = {}
        for p in personas:
            medida = p["codigo_medida_fuera"]
            if medida not in por_medida:
                por_medida[medida] = []
            por_medida[medida].append(p)

        grupos_talla = []

        for medida, pers in por_medida.items():
            sin_diff = [p for p in pers if p["diferencia_cm"] is None]
            con_diff = sorted(
                [p for p in pers if p["diferencia_cm"] is not None],
                key=lambda x: x["diferencia_cm"]
            )

            # Agrupar con_diff por tolerancia ±1cm en diferencia
            visitados = [False] * len(con_diff)
            for i, p in enumerate(con_diff):
                if visitados[i]:
                    continue
                grupo = [p]
                visitados[i] = True
                for j in range(i + 1, len(con_diff)):
                    if not visitados[j] and abs(
                        con_diff[j]["diferencia_cm"] - p["diferencia_cm"]
                    ) <= tolerancia:
                        grupo.append(con_diff[j])
                        visitados[j] = True

                diffs = [x["diferencia_cm"] for x in grupo]
                grupos_talla.append({
                    "medida_fuera":      medida,
                    "diferencia_centro": round(sum(diffs) / len(diffs), 1),
                    "cantidad":          len(grupo),
                    "personas": [
                        {
                            "nombre":        x["nombre"],
                            "dni":           x["dni"],
                            "diferencia_cm": x["diferencia_cm"],
                            "largo":         float(x["largo"]) if x["largo"] else None,
                        }
                        for x in grupo
                    ],
                })

            # Fuera de tabla como grupo aparte
            if sin_diff:
                grupos_talla.append({
                    "medida_fuera":      medida,
                    "diferencia_centro": None,
                    "cantidad":          len(sin_diff),
                    "personas": [
                        {
                            "nombre":          x["nombre"],
                            "dni":             x["dni"],
                            "diferencia_cm":   None,
                            "valor_corporal":  float(x["valor_real_cm"]) if x["valor_real_cm"] else None,
                            "largo":           float(x["largo"]) if x["largo"] else None,
                        }
                        for x in sin_diff
                    ],
                })

        resultado.append({
            "talla_asignada": talla,
            "grupos":         grupos_talla,
        })

    resultado.sort(
        key=lambda x: int(x["talla_asignada"]) if x["talla_asignada"].isdigit() else 9999
    )
    return resultado