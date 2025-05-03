from fastapi import FastAPI
import os
import main_server.api.routers.reports

UPLOAD_FOLDER = os.path.abspath('../uploads')

app = FastAPI()

app.include_router(main_server.api.routers.reports.router, prefix='/api')
app.include_router(main_server.api.routers.auth.router, prefix='/api')
app.include_router(main_server.api.routers.test.router, prefix='/api')
app.include_router(main_server.api.routers.user.router, prefix='/api')

@app.on_event("startup")
async def startup_event():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)