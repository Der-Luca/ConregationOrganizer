from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from db.database import get_db
from models.cart import Cart
from models.cart_session import CartSession
from models.cart_assignment import CartAssignment
from models.user import User
from models.absence import Absence
from schemas.cart_session import (
    CartSessionCreate,
    CartSessionOut,
    CartSessionUpdate,
    CartAssignmentOut,
    AssignmentInput,
    AssignmentRespondRequest,
    CartStatsOut,
)
from auth.deps import require_cartplanner, get_current_user


router = APIRouter(prefix="/cart-sessions", tags=["Cart Sessions"])


def _session_to_out(session: CartSession, db: Session) -> CartSessionOut:
    cart = db.query(Cart).filter(Cart.id == session.cart_id).first()
    assignments = []
    for a in session.assignments:
        user = db.query(User).filter(User.id == a.user_id).first()
        assignments.append(CartAssignmentOut(
            id=a.id,
            user_id=a.user_id,
            firstname=user.firstname if user else "?",
            lastname=user.lastname if user else "?",
            gender=user.gender if user else None,
            is_captain=a.is_captain,
            status=a.status,
            responded_at=a.responded_at,
        ))
    return CartSessionOut(
        id=session.id,
        cart_id=session.cart_id,
        cart_name=cart.name if cart else "Unknown",
        date=session.date,
        start_time=session.start_time,
        end_time=session.end_time,
        month=session.month,
        assignments=assignments,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


def _validate_assignments(assignments: list[AssignmentInput], session_date, start_time, end_time, db: Session, exclude_session_id=None):
    """Validate assignment rules: max 4, captain must be male, no double-booking, one captain."""
    if len(assignments) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 users per session")

    captains = [a for a in assignments if a.is_captain]
    if len(captains) > 1:
        raise HTTPException(status_code=400, detail="Only one captain per session")

    for a in assignments:
        user = db.query(User).filter(User.id == a.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User {a.user_id} not found")
        if not user.active:
            raise HTTPException(status_code=400, detail=f"User {user.firstname} {user.lastname} is inactive")

        if a.is_captain and user.gender != "male":
            raise HTTPException(
                status_code=400,
                detail=f"Captain must be male. {user.firstname} {user.lastname} is not eligible.",
            )

        # Check absence overlap
        session_start = datetime.combine(session_date, start_time)
        session_end = datetime.combine(session_date, end_time)
        absence = (
            db.query(Absence)
            .filter(
                Absence.user_id == a.user_id,
                Absence.start_datetime <= session_end,
                Absence.end_datetime >= session_start,
            )
            .first()
        )
        if absence:
            raise HTTPException(
                status_code=409,
                detail=f"{user.firstname} {user.lastname} está ausente en ese horario",
            )

        # Check double-booking: same date, overlapping time
        overlap_query = (
            db.query(CartAssignment)
            .join(CartSession)
            .filter(
                CartAssignment.user_id == a.user_id,
                CartSession.date == session_date,
                CartSession.start_time < end_time,
                CartSession.end_time > start_time,
            )
        )
        if exclude_session_id:
            overlap_query = overlap_query.filter(CartSession.id != exclude_session_id)

        if overlap_query.first():
            raise HTTPException(
                status_code=409,
                detail=f"{user.firstname} {user.lastname} already has a session at this time",
            )


# ── CartPlanner endpoints ──────────────────────────────────────────────

@router.get("", response_model=list[CartSessionOut])
def list_sessions(
    month: str = Query(..., description="YYYY-MM"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(CartSession)
        .filter(CartSession.month == month)
        .order_by(CartSession.date, CartSession.start_time)
        .all()
    )
    return [_session_to_out(s, db) for s in sessions]


@router.post("", response_model=CartSessionOut, status_code=201)
def create_session(
    data: CartSessionCreate,
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    cart = db.query(Cart).filter(Cart.id == data.cart_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    if not cart.active:
        raise HTTPException(status_code=400, detail="Cart is not active")

    _validate_assignments(data.assignments, data.date, data.start_time, data.end_time, db)

    month_str = f"{data.date.year}-{data.date.month:02d}"

    session = CartSession(
        cart_id=data.cart_id,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        month=month_str,
        created_by=current_user["sub"],
    )
    db.add(session)
    db.flush()

    for a in data.assignments:
        assignment = CartAssignment(
            session_id=session.id,
            user_id=a.user_id,
            is_captain=a.is_captain,
            status="pending",
        )
        db.add(assignment)

    db.commit()
    db.refresh(session)
    return _session_to_out(session, db)


@router.put("/{session_id}", response_model=CartSessionOut)
def update_session(
    session_id: UUID,
    data: CartSessionUpdate,
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    session = db.query(CartSession).filter(CartSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if data.date is not None:
        session.date = data.date
        session.month = f"{data.date.year}-{data.date.month:02d}"
    if data.start_time is not None:
        session.start_time = data.start_time
    if data.end_time is not None:
        session.end_time = data.end_time

    # Re-validate existing assignments against new times
    existing_assignments = [
        AssignmentInput(user_id=a.user_id, is_captain=a.is_captain)
        for a in session.assignments
    ]
    _validate_assignments(
        existing_assignments, session.date, session.start_time, session.end_time, db,
        exclude_session_id=session.id,
    )

    db.commit()
    db.refresh(session)
    return _session_to_out(session, db)


@router.delete("/{session_id}")
def delete_session(
    session_id: UUID,
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    session = db.query(CartSession).filter(CartSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.commit()
    return {"ok": True}


@router.post("/{session_id}/assignments", response_model=CartSessionOut)
def add_assignment(
    session_id: UUID,
    data: AssignmentInput,
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    session = db.query(CartSession).filter(CartSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    current_count = db.query(CartAssignment).filter(CartAssignment.session_id == session_id).count()
    if current_count >= 4:
        raise HTTPException(status_code=400, detail="Maximum 4 users per session")

    # Check if user already assigned
    existing = (
        db.query(CartAssignment)
        .filter(CartAssignment.session_id == session_id, CartAssignment.user_id == data.user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already assigned to this session")

    _validate_assignments([data], session.date, session.start_time, session.end_time, db, exclude_session_id=session.id)

    # If new assignment is captain, unset any existing captain
    if data.is_captain:
        db.query(CartAssignment).filter(
            CartAssignment.session_id == session_id, CartAssignment.is_captain == True
        ).update({"is_captain": False})

    assignment = CartAssignment(
        session_id=session.id,
        user_id=data.user_id,
        is_captain=data.is_captain,
        status="pending",
    )
    db.add(assignment)
    db.flush()

    db.commit()
    db.refresh(session)
    return _session_to_out(session, db)


@router.delete("/{session_id}/assignments/{assignment_id}")
def remove_assignment(
    session_id: UUID,
    assignment_id: UUID,
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    assignment = (
        db.query(CartAssignment)
        .filter(CartAssignment.id == assignment_id, CartAssignment.session_id == session_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    db.delete(assignment)
    db.commit()
    return {"ok": True}


@router.get("/stats", response_model=list[CartStatsOut])
def get_stats(
    year: int = Query(..., description="Year for stats"),
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    year_prefix = f"{year}-"

    # Count accepted assignments per user for the year
    results = (
        db.query(
            CartAssignment.user_id,
            func.count(CartAssignment.id).label("count"),
            func.max(CartSession.date).label("last_date"),
        )
        .join(CartSession)
        .filter(CartSession.month.like(f"{year_prefix}%"))
        .filter(CartAssignment.status.in_(["accepted", "pending"]))
        .group_by(CartAssignment.user_id)
        .all()
    )

    stats_map = {r.user_id: (r.count, r.last_date) for r in results}

    # Get all active users
    users = db.query(User).filter(User.active == True).all()

    stats = []
    for u in users:
        count, last_date = stats_map.get(u.id, (0, None))
        stats.append(CartStatsOut(
            user_id=u.id,
            firstname=u.firstname,
            lastname=u.lastname,
            gender=u.gender,
            count=count,
            last_date=last_date,
        ))

    stats.sort(key=lambda s: s.count)
    return stats


# ── Publisher endpoints ────────────────────────────────────────────────

@router.get("/my-assignments", response_model=list[CartSessionOut])
def get_my_assignments(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user["sub"]

    session_ids = (
        db.query(CartAssignment.session_id)
        .filter(CartAssignment.user_id == user_id)
        .subquery()
    )

    sessions = (
        db.query(CartSession)
        .filter(CartSession.id.in_(session_ids))
        .order_by(CartSession.date, CartSession.start_time)
        .all()
    )
    return [_session_to_out(s, db) for s in sessions]


@router.patch("/assignments/{assignment_id}/respond", response_model=CartAssignmentOut)
def respond_to_assignment(
    assignment_id: UUID,
    data: AssignmentRespondRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assignment = db.query(CartAssignment).filter(CartAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if str(assignment.user_id) != current_user["sub"]:
        raise HTTPException(status_code=403, detail="You can only respond to your own assignments")

    assignment.status = data.status
    assignment.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(assignment)

    user = db.query(User).filter(User.id == assignment.user_id).first()
    return CartAssignmentOut(
        id=assignment.id,
        user_id=assignment.user_id,
        firstname=user.firstname,
        lastname=user.lastname,
        gender=user.gender,
        is_captain=assignment.is_captain,
        status=assignment.status,
        responded_at=assignment.responded_at,
    )
