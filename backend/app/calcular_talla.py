"""
calcular_talla.py
-----------------
Lógica central de asignación de talla.

Especiales — diferencia usando medidas_prenda (_P):
  Cuando cintura manda → talla M(38), pero pecho hubiera dado S(36):
  diferencia = medida_prenda(PECHO, M=38) - medida_prenda(PECHO, S=36)
  Ej: 106 - 101 = +5cm  (la prenda le quedará 5cm más ancha en pecho)

Agrupación de especiales (en reporte.py):
  Primero por talla asignada, luego por diferencia similar ±1cm.
"""

from app.database import get_conn


def _get_rangos_prenda(prenda_codigo: str) -> dict:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT t.numero, t.id, t.orden_num,
                   rt.codigo_medida, rt.rango_min, rt.rango_max
            FROM tallas t
            JOIN prendas p ON p.id = t.prenda_id
            JOIN rangos_tallaje rt ON rt.talla_id = t.id
            WHERE p.codigo = %s
            ORDER BY t.orden_num
        """, (prenda_codigo,))
        rows = cur.fetchall()

    rangos = {}
    for r in rows:
        num = r["numero"]
        if num not in rangos:
            rangos[num] = {"talla_id": r["id"], "orden_num": r["orden_num"], "medidas": {}}
        rangos[num]["medidas"][r["codigo_medida"]] = {
            "min": float(r["rango_min"]),
            "max": float(r["rango_max"]),
        }
    return rangos


def _get_medidas_prenda(prenda_codigo: str) -> dict:
    """
    Retorna: { numero_talla: { "PECHO": 106.0, "CINTURA": 101.4, ... } }
    """
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT t.numero, mp.codigo_medida, mp.valor_cm
            FROM medidas_prenda mp
            JOIN tallas t ON t.id = mp.talla_id
            JOIN prendas p ON p.id = t.prenda_id
            WHERE p.codigo = %s
            ORDER BY t.orden_num
        """, (prenda_codigo,))
        rows = cur.fetchall()

    medidas = {}
    for r in rows:
        num = r["numero"]
        if num not in medidas:
            medidas[num] = {}
        medidas[num][r["codigo_medida"]] = float(r["valor_cm"])
    return medidas


def _talla_para_medida(valor: float, medida: str, rangos: dict):
    for numero, info in rangos.items():
        m = info["medidas"].get(medida)
        if m and m["min"] <= valor <= m["max"]:
            return numero, info
    return None, None


def _get_umbral() -> int:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT valor FROM configuracion WHERE clave = 'umbral_especial_tallas'")
        row = cur.fetchone()
    return int(row["valor"]) if row else 2


def calcular_talla_saco(medidas: dict) -> dict:
    rangos          = _get_rangos_prenda("SACO")
    medidas_prenda  = _get_medidas_prenda("SACO")
    umbral          = _get_umbral()

    pecho_val   = medidas.get("PECHO")
    cintura_val = medidas.get("CINTURA")

    talla_pecho,   info_pecho   = _talla_para_medida(pecho_val,   "PECHO",   rangos)
    talla_cintura, info_cintura = _talla_para_medida(cintura_val, "CINTURA", rangos)

    talla_final     = None
    determinada_por = "PECHO"
    especial        = False
    especiales_det  = []

    # Fuera de tabla completamente
    if talla_pecho is None and talla_cintura is None:
        return {"talla": None, "determinada_por": None, "especial": True,
                "especiales_detalle": [{"codigo_medida_fuera": "PECHO",
                    "valor_real_cm": pecho_val, "diferencia_cm": None,
                    "rango_esperado_min": 0.0, "rango_esperado_max": 0.0,
                    "talla_asignada": None, "talla_secundaria": None,
                    "motivo": "fuera_de_tabla"}]}

    # Solo pecho cae → cintura fuera de tabla
    if talla_pecho is not None and talla_cintura is None:
        talla_final     = talla_pecho
        determinada_por = "PECHO"
        especial        = True
        _agregar_especial(especiales_det, "CINTURA", talla_pecho, talla_cintura,
                          medidas_prenda, "fuera_de_tabla", cintura_val)

    # Solo cintura cae → pecho fuera de tabla
    elif talla_pecho is None and talla_cintura is not None:
        talla_final     = talla_cintura
        determinada_por = "CINTURA"
        especial        = True
        _agregar_especial(especiales_det, "PECHO", talla_cintura, talla_pecho,
                          medidas_prenda, "fuera_de_tabla", pecho_val)

    # Ambos caen
    else:
        orden_pecho   = info_pecho["orden_num"]
        orden_cintura = info_cintura["orden_num"]

        if orden_cintura > orden_pecho:
            tope_pecho = rangos[talla_pecho]["medidas"]["PECHO"]["max"]
            if cintura_val > tope_pecho + 2:
                talla_final     = talla_cintura
                determinada_por = "CINTURA"
                diff_tallas = orden_cintura - orden_pecho
                if diff_tallas >= umbral:
                    especial = True
                    _agregar_especial(especiales_det, "PECHO", talla_cintura,
                                      talla_pecho, medidas_prenda, "diferencia_tallas")
            else:
                talla_final     = talla_pecho
                determinada_por = "PECHO"
        else:
            talla_final     = talla_pecho
            determinada_por = "PECHO"

    return {
        "talla":              talla_final,
        "determinada_por":    determinada_por,
        "especial":           especial,
        "especiales_detalle": especiales_det,
    }


def calcular_talla_pantalon(medidas: dict) -> dict:
    rangos          = _get_rangos_prenda("PANTALON")
    medidas_prenda  = _get_medidas_prenda("PANTALON")
    umbral          = _get_umbral()

    cintura_val = medidas.get("CINTURA")
    cadera_val  = medidas.get("CADERA")

    talla_cintura, info_cintura = _talla_para_medida(cintura_val, "CINTURA", rangos)
    talla_cadera,  info_cadera  = _talla_para_medida(cadera_val,  "CADERA",  rangos)

    talla_final     = None
    determinada_por = "CINTURA"
    especial        = False
    especiales_det  = []

    if talla_cintura is None and talla_cadera is None:
        return {"talla": None, "determinada_por": None, "especial": True,
                "especiales_detalle": [{"codigo_medida_fuera": "CINTURA",
                    "valor_real_cm": cintura_val, "diferencia_cm": None,
                    "rango_esperado_min": 0.0, "rango_esperado_max": 0.0,
                    "talla_asignada": None, "talla_secundaria": None,
                    "motivo": "fuera_de_tabla"}]}

    if talla_cintura is not None and talla_cadera is None:
        talla_final     = talla_cintura
        determinada_por = "CINTURA"
        especial        = True
        _agregar_especial(especiales_det, "CADERA", talla_cintura, talla_cadera,
                          medidas_prenda, "fuera_de_tabla", cadera_val)

    elif talla_cintura is None and talla_cadera is not None:
        talla_final     = talla_cadera
        determinada_por = "CADERA"
        especial        = True
        _agregar_especial(especiales_det, "CINTURA", talla_cadera, talla_cintura,
                          medidas_prenda, "fuera_de_tabla", cintura_val)

    else:
        orden_cintura = info_cintura["orden_num"]
        orden_cadera  = info_cadera["orden_num"]

        if orden_cadera > orden_cintura:
            tope_cintura = rangos[talla_cintura]["medidas"]["CINTURA"]["max"]
            if cadera_val > tope_cintura + 2:
                talla_final     = talla_cadera
                determinada_por = "CADERA"
                diff_tallas = orden_cadera - orden_cintura
                if diff_tallas >= umbral:
                    especial = True
                    _agregar_especial(especiales_det, "CINTURA", talla_cadera,
                                      talla_cintura, medidas_prenda, "diferencia_tallas")
            else:
                talla_final     = talla_cintura
                determinada_por = "CINTURA"
        else:
            talla_final     = talla_cintura
            determinada_por = "CINTURA"

    return {
        "talla":              talla_final,
        "determinada_por":    determinada_por,
        "especial":           especial,
        "especiales_detalle": especiales_det,
    }


# ── Helper principal ──────────────────────────────────────────────────────────

def _agregar_especial(lista: list, medida_fuera: str,
                      talla_asignada: str, talla_secundaria: str,
                      medidas_prenda: dict, motivo: str,
                      valor_corporal=None):
    """
    Calcula la diferencia en cm de prenda entre la talla asignada
    y la talla que hubiera dado la medida secundaria.

    diferencia = medida_prenda(talla_asignada) - medida_prenda(talla_secundaria)

    Positivo: la prenda le queda más grande en esa medida.
    Negativo: la prenda le queda más chica.

    valor_corporal: medida corporal real, se guarda en valor_real_cm
                    para los casos fuera de tabla.
    """
    valor_asignada   = medidas_prenda.get(talla_asignada, {}).get(medida_fuera)   if talla_asignada   else None
    valor_secundaria = medidas_prenda.get(talla_secundaria, {}).get(medida_fuera) if talla_secundaria else None

    if valor_asignada is not None and valor_secundaria is not None:
        diferencia = round(valor_asignada - valor_secundaria, 2)
    else:
        diferencia = None

    lista.append({
        "codigo_medida_fuera": medida_fuera,
        "diferencia_cm":       diferencia,
        "talla_asignada":      talla_asignada,
        "talla_secundaria":    talla_secundaria,
        "valor_real_cm":       valor_corporal if valor_corporal is not None else (valor_asignada or 0.0),
        "rango_esperado_min":  valor_secundaria or 0.0,
        "rango_esperado_max":  valor_secundaria or 0.0,
        "motivo":              motivo,
    })