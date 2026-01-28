from fastapi import FastAPI
from sqlalchemy import text
from models.booking_participant import BookingParticipant
from routers import carts, events
from db.database import engine
from db.base import Base
import models  # wichtig: triggert Model-Imports
from fastapi.middleware.cors import CORSMiddleware
from routers import bookings
from routers import users
from routers import auth
from routers import register


app = FastAPI()


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def health():
    return {"status": "ok"}


@app.get("/db-health")
def db_health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"db": "ok"}

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(carts.router)
app.include_router(events.router)
app.include_router(bookings.router)
app.include_router(register.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)