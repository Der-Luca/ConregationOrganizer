from fastapi import FastAPI
from sqlalchemy import text
from routers import carts
from db.database import engine
from db.base import Base
import models  # triggers model imports
from fastapi.middleware.cors import CORSMiddleware
from routers import cart_sessions
from routers import users
from routers import auth
from routers import register
from routers import meeting_points
from routers import stats
from routers import absences
from routers import talk_uploads


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
app.include_router(cart_sessions.router)
app.include_router(register.router)
app.include_router(meeting_points.router)
app.include_router(stats.router)
app.include_router(absences.router)
app.include_router(talk_uploads.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
