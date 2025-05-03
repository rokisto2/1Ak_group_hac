from fastapi import FastAPI
import os

from starlette.middleware.cors import CORSMiddleware

import main_server.api.routers.reports

UPLOAD_FOLDER = os.path.abspath('../uploads')

app = FastAPI()
# TODO add env fro allow domen
# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешить все домены (небезопасно для прода!)
    allow_credentials=True,
    allow_methods=["*"],  # Разрешить все методы (GET, POST, PUT и т.д.)
    allow_headers=["*"],  # Разрешить все заголовки
)
app.include_router(main_server.api.routers.reports.router, prefix='/api')
app.include_router(main_server.api.routers.auth.router, prefix='/api')
app.include_router(main_server.api.routers.test.router, prefix='/api')
app.include_router(main_server.api.routers.user.router, prefix='/api')

@app.on_event("startup")
async def startup_event():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)