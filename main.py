from fastapi import FastAPI
import os
import api.reports
import api.test
import api.auth
import api.user

UPLOAD_FOLDER = os.path.abspath('uploads')

app = FastAPI()

app.include_router(api.reports.router, prefix='/api')
app.include_router(api.auth.router, prefix='/api')
app.include_router(api.test.router, prefix='/api')
app.include_router(api.user.router, prefix='/api')

@app.on_event("startup")
async def startup_event():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)