from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import User
from schemas.user import UserOut
from auth.deps import require_admin

router = APIRouter(prefix="/users", tags=["Users"])



@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return db.query(User).all()

