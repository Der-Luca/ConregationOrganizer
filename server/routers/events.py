from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from models.event import Event
from schemas.event import EventCreate, EventOut
from auth.deps import get_current_user

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=list[EventOut])
def list_events(
    _current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Event).all()


@router.post("", response_model=EventOut)
def create_event(
    data: EventCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = Event(**data.model_dump())
    db.add(event)
    db.flush()
    db.commit()
    db.refresh(event)
    return event
