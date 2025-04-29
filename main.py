from fastapi import FastAPI
import os
import api.reports

UPLOAD_FOLDER = os.path.abspath('uploads')

app = FastAPI()

app.include_router(api.reports.router, prefix='/api')

@app.on_event("startup")
async def startup_event():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)