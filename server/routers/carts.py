from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from models.cart import Cart
from schemas.cart import CartCreate, CartOut

router = APIRouter(prefix="/carts", tags=["Carts"])


@router.get("", response_model=list[CartOut])
def list_carts(db: Session = Depends(get_db)):
    return db.query(Cart).all()


@router.post("", response_model=CartOut)
def create_cart(data: CartCreate, db: Session = Depends(get_db)):
    cart = Cart(**data.model_dump())
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return cart
