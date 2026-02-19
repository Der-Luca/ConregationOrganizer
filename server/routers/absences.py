from datetime import datetime, date, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from auth.deps import get_current_user, require_cartplanner
from models.absence import Absence
from models.user import User
from schemas.absence import AbsenceCreate, AbsenceOut


router = APIRouter(prefix="/absences", tags=["Absences"])


def _to_out(item: Absence) -> AbsenceOut:
    user_name = None
    if item.user:
        user_name = f"{item.user.firstname} {item.user.lastname}"
    return AbsenceOut(
        id=item.id,
        user_id=item.user_id,
        start_datetime=item.start_datetime,
        end_datetime=item.end_datetime,
        reason=item.reason,
        user_name=user_name,
    )


@router.get("", response_model=list[AbsenceOut])
def list_my_absences(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Absence).filter(Absence.user_id == current_user["sub"])

    if from_date:
        query = query.filter(Absence.end_datetime >= datetime.combine(from_date, time.min))
    if to_date:
        query = query.filter(Absence.start_datetime <= datetime.combine(to_date, time.max))

    items = query.order_by(Absence.start_datetime.desc()).all()
    return [_to_out(i) for i in items]


@router.get("/calendar", response_model=list[AbsenceOut])
def list_absences_for_date(
    date_value: date = Query(..., alias="date"),
    _current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    start = datetime.combine(date_value, time.min)
    end = datetime.combine(date_value, time.max)

    items = (
        db.query(Absence)
        .filter(Absence.start_datetime <= end, Absence.end_datetime >= start)
        .all()
    )
    return [_to_out(i) for i in items]


@router.post("", response_model=AbsenceOut)
def create_absence(
    data: AbsenceCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.end_datetime <= data.start_datetime:
        raise HTTPException(
            status_code=400,
            detail="La hora de fin debe ser posterior a la hora de inicio",
        )

    item = Absence(
        user_id=current_user["sub"],
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        reason=data.reason,
    )
    db.add(item)
    db.flush()
    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.delete("/{absence_id}")
def delete_absence(
    absence_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Absence).filter(Absence.id == absence_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Absence not found")
    if str(item.user_id) != current_user["sub"]:
        raise HTTPException(status_code=403, detail="You can only delete your own absences")
    db.delete(item)
    db.commit()
    return {"ok": True}
