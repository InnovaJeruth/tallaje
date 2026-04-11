from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import personas, mediciones, rangos, reporte, configuracion

app = FastAPI(title="Sistema de Tallaje SAMITEX", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(personas.router,       prefix="/api/personas",       tags=["Personas"])
app.include_router(mediciones.router,     prefix="/api/mediciones",     tags=["Mediciones"])
app.include_router(rangos.router,         prefix="/api/rangos",         tags=["Rangos"])
app.include_router(reporte.router,        prefix="/api/reporte",        tags=["Reporte"])
app.include_router(configuracion.router,  prefix="/api/configuracion",  tags=["Configuración"])

@app.get("/")
def root():
    return {"status": "ok", "sistema": "Tallaje SAMITEX"}
