from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db
from auth.deps import get_current_user
from models.user import User
from models.meeting_point import MeetingPoint
from models.cart_assignment import CartAssignment
from models.cart_session import CartSession
from schemas.stats import UserStatsOut


router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/overview", response_model=list[UserStatsOut])
def get_overview_stats(
    year: int = Query(..., description="Year e.g. 2026"),
    _current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    year_prefix = f"{year}-"

    meeting_rows = (
        db.query(
            MeetingPoint.conductor_id,
            func.count().label("count"),
            func.max(MeetingPoint.date).label("last_date"),
        )
        .filter(
            MeetingPoint.month.like(f"{year_prefix}%"),
            MeetingPoint.conductor_id.isnot(None),
        )
        .group_by(MeetingPoint.conductor_id)
        .all()
    )
    meeting_map = {
        row.conductor_id: {"count": row.count, "last_date": row.last_date}
        for row in meeting_rows
    }

    cart_rows = (
        db.query(
            CartAssignment.user_id,
            func.count(CartAssignment.id).label("count"),
            func.max(CartSession.date).label("last_date"),
        )
        .join(CartSession)
        .filter(
            CartSession.month.like(f"{year_prefix}%"),
            CartAssignment.status.in_(["accepted", "pending"]),
        )
        .group_by(CartAssignment.user_id)
        .all()
    )
    cart_map = {
        row.user_id: {"count": row.count, "last_date": row.last_date}
        for row in cart_rows
    }

    users = db.query(User).filter(User.active == True).all()
    result = []
    for u in users:
        meeting_info = meeting_map.get(u.id, {"count": 0, "last_date": None})
        cart_info = cart_map.get(u.id, {"count": 0, "last_date": None})
        result.append(
            UserStatsOut(
                user_id=u.id,
                firstname=u.firstname,
                lastname=u.lastname,
                meeting_points_count=meeting_info["count"],
                meeting_points_last_date=meeting_info["last_date"],
                cart_sessions_count=cart_info["count"],
                cart_sessions_last_date=cart_info["last_date"],
            )
        )

    result.sort(key=lambda x: (x.meeting_points_count + x.cart_sessions_count, x.lastname, x.firstname))
    return result
