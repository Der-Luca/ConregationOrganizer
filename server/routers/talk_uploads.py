import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db
from auth.deps import require_talk_assistant, get_current_user
from auth.security import hash_password, verify_password
from models.talk_upload import TalkUploadLink, TalkUploadFile
from schemas.talk_upload import (
    TalkLinkCreate,
    TalkLinkUpdate,
    TalkLinkOut,
    TalkLinkWithFilesOut,
    TalkFileOut,
    TalkLinkPublicOut,
)


router = APIRouter(prefix="/talk-links", tags=["Talk Uploads"])

BASE_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "talk_links"
BASE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024  # 2GB
UPLOAD_TOKEN_TTL_SECONDS = 2 * 60 * 60


def _total_bytes(db: Session, link_id) -> int:
    total = (
        db.query(func.coalesce(func.sum(TalkUploadFile.size_bytes), 0))
        .filter(TalkUploadFile.link_id == link_id)
        .scalar()
    )
    return int(total or 0)


def _link_or_404(db: Session, link_id: uuid.UUID) -> TalkUploadLink:
    link = db.query(TalkUploadLink).filter(TalkUploadLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    return link


def _token_or_404(db: Session, token: str) -> TalkUploadLink:
    link = db.query(TalkUploadLink).filter(TalkUploadLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    return link


def _ensure_active(link: TalkUploadLink) -> None:
    if not link.active:
        raise HTTPException(status_code=410, detail="Link is inactive")
    if link.expires_at and link.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Link expired")


def _ensure_upload_token(link: TalkUploadLink, token: str) -> None:
    if not link.upload_token or not link.upload_token_expires_at:
        raise HTTPException(status_code=401, detail="Upload not unlocked")
    if link.upload_token != token:
        raise HTTPException(status_code=401, detail="Invalid upload token")
    if link.upload_token_expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Upload token expired")


def _as_out(db: Session, link: TalkUploadLink) -> TalkLinkOut:
    total = _total_bytes(db, link.id)
    return TalkLinkOut(
        id=link.id,
        token=link.token,
        title=link.title,
        expires_at=link.expires_at,
        has_password=bool(link.password_hash),
        max_total_bytes=link.max_total_bytes,
        total_bytes=total,
        file_count=len(link.files),
        created_at=link.created_at,
    )


@router.get("", response_model=List[TalkLinkWithFilesOut])
def list_links(
    _current_user=Depends(require_talk_assistant),
    db: Session = Depends(get_db),
):
    links = db.query(TalkUploadLink).order_by(TalkUploadLink.created_at.desc()).all()
    items: List[TalkLinkWithFilesOut] = []
    for link in links:
        total = _total_bytes(db, link.id)
        files = [
            TalkFileOut(
                id=f.id,
                original_filename=f.original_filename,
                size_bytes=f.size_bytes,
                uploaded_at=f.uploaded_at,
            )
            for f in sorted(link.files, key=lambda x: x.uploaded_at, reverse=True)
        ]
        items.append(
            TalkLinkWithFilesOut(
                id=link.id,
                token=link.token,
                title=link.title,
                expires_at=link.expires_at,
                has_password=bool(link.password_hash),
                max_total_bytes=link.max_total_bytes,
                total_bytes=total,
                file_count=len(link.files),
                created_at=link.created_at,
                files=files,
            )
        )
    return items


@router.post("", response_model=TalkLinkOut)
def create_link(
    data: TalkLinkCreate,
    current_user=Depends(require_talk_assistant),
    db: Session = Depends(get_db),
):
    token = uuid.uuid4().hex
    password_hash = hash_password(data.password) if data.password else None

    link = TalkUploadLink(
        token=token,
        title=data.title,
        password_hash=password_hash,
        expires_at=data.expires_at,
        max_total_bytes=MAX_TOTAL_BYTES,
        created_by=current_user["sub"],
        active=True,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return _as_out(db, link)


@router.delete("/{link_id}")
def delete_link(
    link_id: uuid.UUID,
    _current_user=Depends(require_talk_assistant),
    db: Session = Depends(get_db),
):
    link = _link_or_404(db, link_id)
    dir_path = BASE_UPLOAD_DIR / link.token
    if dir_path.exists():
        for child in dir_path.iterdir():
            if child.is_file():
                child.unlink()
        dir_path.rmdir()

    db.delete(link)
    db.commit()
    return {"ok": True}


@router.patch("/{link_id}", response_model=TalkLinkOut)
def update_link(
    link_id: uuid.UUID,
    data: TalkLinkUpdate,
    _current_user=Depends(require_talk_assistant),
    db: Session = Depends(get_db),
):
    link = _link_or_404(db, link_id)

    if data.title is not None:
        link.title = data.title
    if data.expires_at is not None:
        link.expires_at = data.expires_at
    if data.active is not None:
        link.active = data.active
    if data.password is not None:
        link.password_hash = hash_password(data.password) if data.password else None
        link.upload_token = None
        link.upload_token_expires_at = None

    db.commit()
    db.refresh(link)
    return _as_out(db, link)


@router.get("/{link_id}/files/{file_id}/download")
def download_file(
    link_id: uuid.UUID,
    file_id: uuid.UUID,
    _current_user=Depends(require_talk_assistant),
    db: Session = Depends(get_db),
):
    link = _link_or_404(db, link_id)
    file = db.query(TalkUploadFile).filter(
        TalkUploadFile.id == file_id,
        TalkUploadFile.link_id == link.id,
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = BASE_UPLOAD_DIR / link.token / file.stored_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing")
    return FileResponse(
        path=str(file_path),
        filename=file.original_filename,
        media_type="application/octet-stream",
    )


@router.get("/public/{token}", response_model=TalkLinkPublicOut)
def get_public_link(token: str, db: Session = Depends(get_db)):
    link = _token_or_404(db, token)
    _ensure_active(link)
    total = _total_bytes(db, link.id)
    return TalkLinkPublicOut(
        title=link.title,
        expires_at=link.expires_at,
        has_password=bool(link.password_hash),
        max_total_bytes=link.max_total_bytes,
        total_bytes=total,
        file_count=len(link.files),
    )


@router.post("/public/{token}/unlock")
def unlock_public_link(
    token: str,
    password: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    link = _token_or_404(db, token)
    _ensure_active(link)

    if link.password_hash:
        if not password or not verify_password(password, link.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")

    link.upload_token = uuid.uuid4().hex
    link.upload_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=UPLOAD_TOKEN_TTL_SECONDS)
    db.commit()

    return {"upload_token": link.upload_token, "expires_at": link.upload_token_expires_at}


@router.post("/public/{token}/upload")
def upload_files(
    token: str,
    files: List[UploadFile] = File(...),
    password: Optional[str] = Form(None),
    upload_token: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    link = _token_or_404(db, token)
    _ensure_active(link)

    if link.password_hash:
        if upload_token:
            _ensure_upload_token(link, upload_token)
        elif password and verify_password(password, link.password_hash):
            pass
        else:
            raise HTTPException(status_code=401, detail="Invalid password")

    total_before = _total_bytes(db, link.id)
    incoming_total = 0
    saved = []

    link_dir = BASE_UPLOAD_DIR / link.token
    link_dir.mkdir(parents=True, exist_ok=True)

    for file in files:
        if not file.filename:
            continue

        contents = file.file
        contents.seek(0, os.SEEK_END)
        size = contents.tell()
        contents.seek(0)
        incoming_total += size

        if total_before + incoming_total > link.max_total_bytes:
            raise HTTPException(status_code=413, detail="Total size limit exceeded")

        stored_name = f"{uuid.uuid4().hex}_{Path(file.filename).name}"
        file_path = link_dir / stored_name

        with open(file_path, "wb") as f:
            while True:
                chunk = contents.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)

        saved.append(
            TalkUploadFile(
                link_id=link.id,
                original_filename=Path(file.filename).name,
                stored_filename=stored_name,
                size_bytes=size,
            )
        )

    if not saved:
        raise HTTPException(status_code=400, detail="No files uploaded")

    db.add_all(saved)
    db.commit()

    return {"ok": True, "uploaded": len(saved)}
