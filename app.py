import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from server.db import pool, init_schema
from server.routes import cruds, data, imports, ai


@asynccontextmanager
async def lifespan(app):
    pool.open(wait=True, timeout=30.0)
    init_schema()
    yield
    pool.close()


app = FastAPI(title="DBX CRUDs", version="1.0.0", lifespan=lifespan)

app.include_router(cruds.router, prefix="/api")
app.include_router(data.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
app.include_router(ai.router, prefix="/api")

# Serve frontend
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dir):
    assets_dir = os.path.join(frontend_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(os.path.join(frontend_dir, "index.html"))
