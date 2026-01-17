from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from models.event import Event
from schemas.event import EventCreate, EventOut

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).all()


@router.post("", response_model=EventOut)
def create_event(data: EventCreate, db: Session = Depends(get_db)):
    event = Event(**data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
