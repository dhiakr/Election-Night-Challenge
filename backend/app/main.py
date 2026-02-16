import time
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from .api.routes import router
from .database import SessionLocal, engine
from .models import Base
from .services.seed import seed_parties

CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]

app = FastAPI(title="Election Night Results API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def on_startup():
    retries = 15
    while retries > 0:
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))

            Base.metadata.create_all(bind=engine)

            db = SessionLocal()
            try:
                seed_parties(db)
            finally:
                db.close()

            print("Database connected and seeded successfully")
            break
        except OperationalError:
            print("Database not ready yet. Retrying...")
            retries -= 1
            time.sleep(2)


@app.get("/")
def health():
    return {"status": "running"}
