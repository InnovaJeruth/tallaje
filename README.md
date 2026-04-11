# Sistema de Tallaje SAMITEX

Stack: FastAPI + React + Vite + Tailwind + PostgreSQL

---

## Estructura

```
tallaje/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── calcular_talla.py
│   │   └── routers/
│   │       ├── personas.py
│   │       ├── mediciones.py
│   │       ├── rangos.py
│   │       ├── reporte.py
│   │       └── configuracion.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   └── ResultadoTalla.jsx
    │   └── pages/
    │       ├── NuevaMedicion.jsx
    │       ├── Reporte.jsx
    │       ├── Configuracion.jsx
    │       └── HistorialPersona.jsx
    └── package.json
```

---

## Setup

### 1. PostgreSQL

```sql
-- En pgAdmin o psql:
CREATE DATABASE mitalla;
\c mitalla
\i schema.sql
```

Luego correr el importador de rangos (desde la carpeta donde tienes el Excel):
```bash
python importar_rangos.py
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

El backend corre en http://127.0.0.1:8000
Docs automáticos en http://127.0.0.1:8000/docs

Credenciales por defecto (cambiar en database.py o variables de entorno):
- DB_NAME=mitalla
- DB_USER=postgres
- DB_PASSWORD=admin
- DB_HOST=127.0.0.1
- DB_PORT=5432

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend corre en http://localhost:5173
El proxy de Vite redirige /api → http://127.0.0.1:8000

---

## Variables de entorno (opcional)

Crea un archivo `.env` en la carpeta `backend/` si quieres sobreescribir las credenciales:

```
DB_NAME=mitalla
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=127.0.0.1
DB_PORT=5432
```

Y en `database.py` ya están con `os.getenv(...)` para leerlas.

---

## Flujo de uso

1. **Medir** → Ingresar nombre, DNI y las 5 medidas corporales → ver talla SACO y PANTALÓN calculadas
2. **Reporte** → Ver agrupaciones por talla, sub-grupos de largos, y tabla de especiales
3. **Config** → Ajustar umbral de especiales, tolerancia de largos, y editar rangos del tallaje
