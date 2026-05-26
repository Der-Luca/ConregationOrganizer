import os
os.environ["PYTHON multipart_MAX_SIZE"] = str(10 * 1024 * 1024 * 1024)  # 10GB

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
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
from routers import settings
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter


UPLOADS_DIR = "/app/uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


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
app.include_router(settings.router)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
