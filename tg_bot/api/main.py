from fastapi import FastAPI
from routers import sending_report_router
app = FastAPI()

app.include_router(sending_report_router, prefix="/telegramm-api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)