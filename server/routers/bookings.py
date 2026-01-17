from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from db.database import get_db
from models.cart_booking import CartBooking
from schemas.booking import BookingCreate, BookingOut

router = APIRouter(prefix="/bookings", tags=["Bookings"])

def overlaps(a_start, a_end, b_start, b_end):
    return and_(a_start < b_end, a_end > b_start)

@router.get("/cart/{cart_id}", response_model=list[BookingOut])
def list_cart_bookings(cart_id, db: Session = Depends(get_db)):
    return db.query(CartBooking).filter(CartBooking.cart_id == cart_id).all()

@router.post("", response_model=BookingOut)
def create_booking(data: BookingCreate, db: Session = Depends(get_db)):
    # Überschneidende Buchungen für diesen Cart zählen
    overlapping = db.query(CartBooking).filter(
        CartBooking.cart_id == data.cart_id,
        overlaps(
            CartBooking.start_datetime,
            CartBooking.end_datetime,
            data.start_datetime,
            data.end_datetime,
        )
    ).count()

    if overlapping >= 2:
        raise HTTPException(
            status_code=409,
            detail="Dieser Cart ist in diesem Zeitraum bereits voll belegt (max. 2)."
        )

    booking = CartBooking(**data.model_dump())
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking
