from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime
from uuid import UUID

from db.database import get_db
from models.cart_booking import CartBooking
from models.booking_participant import BookingParticipant
from models.cart import Cart
from models.user import User
from schemas.booking import BookingCreate, BookingOut, CalendarBookingOut

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def overlaps(a_start, a_end, b_start, b_end):
    """Check if two time ranges overlap"""
    return and_(a_start < b_end, a_end > b_start)


@router.get("/calendar", response_model=list[CalendarBookingOut])
def get_calendar_bookings(
    start_date: datetime = Query(..., description="Start of date range"),
    end_date: datetime = Query(..., description="End of date range"),
    cart_id: UUID | None = Query(None, description="Filter by specific cart"),
    db: Session = Depends(get_db)
):
    """
    Get all bookings in a date range for calendar views.
    Optionally filter by cart_id.
    """
    query = db.query(CartBooking).filter(
        overlaps(
            CartBooking.start_datetime,
            CartBooking.end_datetime,
            start_date,
            end_date
        )
    )
    
    if cart_id:
        query = query.filter(CartBooking.cart_id == cart_id)
    
    bookings = query.all()
    
    # Transform to calendar format
    result = []
    for booking in bookings:
        cart = db.query(Cart).filter(Cart.id == booking.cart_id).first()
        participant_names = [
            f"{p.firstname} {p.lastname}" for p in booking.participants
        ]
        
        result.append(CalendarBookingOut(
            id=booking.id,
            cart_id=booking.cart_id,
            cart_name=cart.name if cart else "Unknown",
            participant_names=participant_names,
            start_datetime=booking.start_datetime,
            end_datetime=booking.end_datetime
        ))
    
    return result


@router.get("/cart/{cart_id}", response_model=list[BookingOut])
def list_cart_bookings(cart_id: UUID, db: Session = Depends(get_db)):
    """Get all bookings for a specific cart"""
    return db.query(CartBooking).filter(CartBooking.cart_id == cart_id).all()


@router.get("/my-bookings", response_model=list[BookingOut])
def get_my_bookings(
    user_id: UUID = Query(..., description="Current user ID"),
    db: Session = Depends(get_db)
):
    """Get all bookings where the user is a participant"""
    bookings = (
        db.query(CartBooking)
        .join(BookingParticipant)
        .filter(BookingParticipant.user_id == user_id)
        .all()
    )
    return bookings


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(data: BookingCreate, db: Session = Depends(get_db)):
    """
    Create a new booking with 1-2 participants.
    Validates:
    - Cart exists and is active
    - Max 2 overlapping bookings per cart
    - All participants exist
    """
    
    # 1. Check cart exists and is active
    cart = db.query(Cart).filter(Cart.id == data.cart_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    if not cart.active:
        raise HTTPException(status_code=400, detail="Cart is not active")
    
    # 2. Validate participants exist
    participants = db.query(User).filter(User.id.in_(data.participant_ids)).all()
    if len(participants) != len(data.participant_ids):
        raise HTTPException(status_code=404, detail="One or more participants not found")
    
    # 3. Check for overlapping bookings (max 2 concurrent bookings per cart)
    overlapping_count = db.query(CartBooking).filter(
        CartBooking.cart_id == data.cart_id,
        overlaps(
            CartBooking.start_datetime,
            CartBooking.end_datetime,
            data.start_datetime,
            data.end_datetime,
        )
    ).count()

    if overlapping_count >= 2:
        raise HTTPException(
            status_code=409,
            detail="This cart is fully booked during this time (max 2 concurrent bookings)"
        )
    
    # 4. Create booking
    booking = CartBooking(
        cart_id=data.cart_id,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        user_id=data.participant_ids[0]  # Keep for backward compatibility
    )
    db.add(booking)
    db.flush()  # Get booking.id before adding participants
    
    # 5. Add participants
    for participant_id in data.participant_ids:
        participant = BookingParticipant(
            booking_id=booking.id,
            user_id=participant_id
        )
        db.add(participant)
    
    db.commit()
    db.refresh(booking)
    
    return booking


@router.delete("/{booking_id}")
def delete_booking(
    booking_id: UUID,
    user_id: UUID = Query(..., description="Current user ID for authorization"),
    db: Session = Depends(get_db)
):
    """Delete a booking (only if user is a participant)"""
    booking = db.query(CartBooking).filter(CartBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if user is a participant
    is_participant = db.query(BookingParticipant).filter(
        BookingParticipant.booking_id == booking_id,
        BookingParticipant.user_id == user_id
    ).first()
    
    if not is_participant:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own bookings"
        )
    
    db.delete(booking)
    db.commit()
    
    return {"ok": True, "message": "Booking deleted"}


@router.get("/available-slots")
def get_available_slots(
    start_datetime: datetime = Query(...),
    end_datetime: datetime = Query(...),
    db: Session = Depends(get_db)
):
    """
    Get carts that have availability (less than 2 bookings) in the given time slot.
    Returns list of carts with their current booking count.
    """
    
    # Get all active carts
    active_carts = db.query(Cart).filter(Cart.active == True).all()
    
    result = []
    for cart in active_carts:
        # Count overlapping bookings for this cart
        overlapping_count = db.query(CartBooking).filter(
            CartBooking.cart_id == cart.id,
            overlaps(
                CartBooking.start_datetime,
                CartBooking.end_datetime,
                start_datetime,
                end_datetime
            )
        ).count()
        
        available_slots = 2 - overlapping_count
        
        if available_slots > 0:
            result.append({
                "cart_id": cart.id,
                "cart_name": cart.name,
                "location": cart.location,
                "available_slots": available_slots
            })
    
    return result
