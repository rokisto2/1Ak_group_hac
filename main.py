from fastapi import FastAPI
import os
from api.first import router

UPLOAD_FOLDER = os.path.abspath('uploads')

app = FastAPI()
app.include_router(router, prefix='/api')

@app.on_event("startup")
async def startup_event():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)