import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session
from uuid import UUID

from db.database import get_db
from models.meeting_point import MeetingPoint
from models.user import User
from schemas.meeting_point import (
    MeetingPointOut,
    MeetingPointCreate,
    MeetingPointSeriesCreate,
    MeetingPointUpdate,
    ConductorStatsOut,
    MonthlyStatsOut,
    RecurrenceType,
)
from auth.deps import get_current_user, require_fieldserviceplanner

router = APIRouter(prefix="/meeting-points", tags=["Meeting Points"])


def _to_out(mp: MeetingPoint) -> dict:
    """Convert a MeetingPoint ORM instance to a dict with conductor_name."""
    conductor_name = None
    if mp.conductor:
        conductor_name = f"{mp.conductor.firstname} {mp.conductor.lastname}"
    return {
        "id": mp.id,
        "date": mp.date,
        "time": mp.time,
        "location": mp.location,
        "conductor_id": mp.conductor_id,
        "conductor_name": conductor_name,
        "outline": mp.outline,
        "link": mp.link,
        "month": mp.month,
        "series_id": mp.series_id,
        "created_at": mp.created_at,
        "updated_at": mp.updated_at,
    }


@router.get("", response_model=list[MeetingPointOut])
def list_meeting_points(
    month: str = Query(..., description="Month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items = (
        db.query(MeetingPoint)
        .filter(MeetingPoint.month == month)
        .order_by(MeetingPoint.date, MeetingPoint.time)
        .all()
    )
    return [_to_out(mp) for mp in items]


@router.get("/export")
def export_meeting_points_pdf(
    month: str = Query(..., description="Month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from utils.meeting_point_pdf import generate_meeting_points_pdf

    items = (
        db.query(MeetingPoint)
        .filter(MeetingPoint.month == month)
        .order_by(MeetingPoint.date, MeetingPoint.time)
        .all()
    )
    pdf_buffer = generate_meeting_points_pdf(items, month)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=puntos_encuentro_{month}.pdf"},
    )


@router.get("/stats", response_model=list[ConductorStatsOut])
def get_conductor_stats(
    year: int = Query(..., description="Year e.g. 2026"),
    db: Session = Depends(get_db),
    current_user=Depends(require_fieldserviceplanner),
):
    year_prefix = f"{year}-"

    # Count per conductor
    rows = (
        db.query(
            MeetingPoint.conductor_id,
            sa_func.count().label("count"),
            sa_func.max(MeetingPoint.date).label("last_date"),
        )
        .filter(
            MeetingPoint.month.like(f"{year_prefix}%"),
            MeetingPoint.conductor_id.isnot(None),
        )
        .group_by(MeetingPoint.conductor_id)
        .all()
    )

    stats_map = {row.conductor_id: {"count": row.count, "last_date": row.last_date} for row in rows}

    # All active users
    active_users = db.query(User).filter(User.active == True).all()

    result = []
    for u in active_users:
        info = stats_map.get(u.id, {"count": 0, "last_date": None})
        result.append(
            ConductorStatsOut(
                user_id=u.id,
                firstname=u.firstname,
                lastname=u.lastname,
                count=info["count"],
                last_date=info["last_date"],
            )
        )

    result.sort(key=lambda x: (x.count, x.lastname, x.firstname))
    return result


@router.get("/stats/monthly", response_model=list[MonthlyStatsOut])
def get_monthly_stats(
    year: int = Query(..., description="Year e.g. 2026"),
    db: Session = Depends(get_db),
    current_user=Depends(require_fieldserviceplanner),
):
    year_prefix = f"{year}-"

    rows = (
        db.query(
            MeetingPoint.month,
            MeetingPoint.conductor_id,
            sa_func.count().label("count"),
        )
        .filter(
            MeetingPoint.month.like(f"{year_prefix}%"),
            MeetingPoint.conductor_id.isnot(None),
        )
        .group_by(MeetingPoint.month, MeetingPoint.conductor_id)
        .order_by(MeetingPoint.month)
        .all()
    )

    # Collect user IDs and fetch names
    user_ids = {row.conductor_id for row in rows}
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {u.id: u for u in users}

    result = []
    for row in rows:
        u = user_map.get(row.conductor_id)
        if not u:
            continue
        result.append(
            MonthlyStatsOut(
                month=row.month,
                user_id=row.conductor_id,
                firstname=u.firstname,
                lastname=u.lastname,
                count=row.count,
            )
        )

    return result


@router.get("/{meeting_point_id}", response_model=MeetingPointOut)
def get_meeting_point(
    meeting_point_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    mp = db.query(MeetingPoint).filter(MeetingPoint.id == meeting_point_id).first()
    if not mp:
        raise HTTPException(status_code=404, detail="Meeting point not found")
    return _to_out(mp)


@router.post("", response_model=MeetingPointOut)
def create_meeting_point(
    data: MeetingPointCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_fieldserviceplanner),
):
    mp = MeetingPoint(
        date=data.date,
        time=data.time,
        location=data.location,
        conductor_id=data.conductor_id,
        outline=data.outline,
        link=data.link,
        month=data.date.strftime("%Y-%m"),
    )
    db.add(mp)
    db.commit()
    db.refresh(mp)
    return _to_out(mp)


def _generate_series_dates(start_date, end_date, recurrence):
    """Generate all dates for a recurring series."""
    dates = []
    current = start_date
    while current <= end_date:
        dates.append(current)
        if recurrence == RecurrenceType.weekly:
            current += timedelta(weeks=1)
        elif recurrence == RecurrenceType.biweekly:
            current += timedelta(weeks=2)
        elif recurrence == RecurrenceType.monthly:
            # Advance by one month
            month = current.month + 1
            year = current.year
            if month > 12:
                month = 1
                year += 1
            day = min(current.day, 28)  # safe day for all months
            current = current.replace(year=year, month=month, day=day)
    return dates


@router.post("/series", response_model=list[MeetingPointOut])
def create_meeting_point_series(
    data: MeetingPointSeriesCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_fieldserviceplanner),
):
    if data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")

    series_id = uuid.uuid4()
    dates = _generate_series_dates(data.start_date, data.end_date, data.recurrence)

    created = []
    for d in dates:
        mp = MeetingPoint(
            date=d,
            time=data.time,
            location=data.location,
            conductor_id=data.conductor_id,
            outline=data.outline,
            link=data.link,
            month=d.strftime("%Y-%m"),
            series_id=series_id,
        )
        db.add(mp)
        created.append(mp)

    db.commit()
    for mp in created:
        db.refresh(mp)

    return [_to_out(mp) for mp in created]


@router.put("/{meeting_point_id}", response_model=MeetingPointOut)
def update_meeting_point(
    meeting_point_id: UUID,
    data: MeetingPointUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_fieldserviceplanner),
):
    mp = db.query(MeetingPoint).filter(MeetingPoint.id == meeting_point_id).first()
    if not mp:
        raise HTTPException(status_code=404, detail="Meeting point not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(mp, key, value)

    # Recompute month if date changed
    if "date" in update_data:
        mp.month = mp.date.strftime("%Y-%m")

    db.commit()
    db.refresh(mp)
    return _to_out(mp)


@router.delete("/{meeting_point_id}")
def delete_meeting_point(
    meeting_point_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_fieldserviceplanner),
):
    mp = db.query(MeetingPoint).filter(MeetingPoint.id == meeting_point_id).first()
    if not mp:
        raise HTTPException(status_code=404, detail="Meeting point not found")

    db.delete(mp)
    db.commit()
    return {"ok": True}


@router.delete("/series/{series_id}")
def delete_meeting_point_series(
    series_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_fieldserviceplanner),
):
    items = db.query(MeetingPoint).filter(MeetingPoint.series_id == series_id).all()
    if not items:
        raise HTTPException(status_code=404, detail="Series not found")

    for mp in items:
        db.delete(mp)

    db.commit()
    return {"ok": True, "deleted": len(items)}
