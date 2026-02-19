from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from db.database import get_db
from models.cart import Cart
from schemas.cart import CartCreate, CartOut, CartUpdate
from auth.deps import get_current_user, require_cartplanner

router = APIRouter(prefix="/carts", tags=["Carts"])


@router.get("", response_model=list[CartOut])
def list_carts(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Cart).all()


@router.post("", response_model=CartOut)
def create_cart(
    data: CartCreate,
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    cart = Cart(**data.model_dump())
    db.add(cart)
    db.flush()
    db.commit()
    db.refresh(cart)
    return cart


@router.patch("/{cart_id}/toggle", response_model=CartOut)
def toggle_cart(
    cart_id: UUID,
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    cart = db.query(Cart).filter(Cart.id == cart_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart.active = not cart.active
    db.commit()
    db.refresh(cart)
    return cart


@router.delete("/{cart_id}")
def delete_cart(
    cart_id: UUID,
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    cart = db.query(Cart).filter(Cart.id == cart_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    db.delete(cart)
    db.commit()
    return {"ok": True}


@router.put("/{cart_id}", response_model=CartOut)
def update_cart(
    cart_id: UUID,
    data: CartUpdate,
    current_user=Depends(require_cartplanner),
    db: Session = Depends(get_db),
):
    cart = db.query(Cart).filter(Cart.id == cart_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart.name = data.name
    cart.location = data.location
    db.commit()
    db.refresh(cart)
    return cart
