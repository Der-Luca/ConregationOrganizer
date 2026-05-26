import os
import io
import logging
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image

from auth.deps import require_admin

# Set up logging
logger = logging.getLogger(__name__)

UPLOADS_DIR = "/app/uploads"
ALLOWED_SLOTS = {"login", "app"}

# Max dimensions: Full HD
MAX_WIDTH = 1920
MAX_HEIGHT = 1080

router = APIRouter(prefix="/settings", tags=["Settings"])


def compress_image(image: Image.Image, content_type: str) -> tuple[bytes, str]:
    """
    Compress image: resize if too large, convert to WebP for better compression.
    Returns (bytes, extension).
    """
    # Resize if dimensions exceed max
    width, height = image.size
    logger.info(f"Original image size: {width}x{height}")
    if width > MAX_WIDTH or height > MAX_HEIGHT:
        # Calculate new dimensions maintaining aspect ratio
        ratio = min(MAX_WIDTH / width, MAX_HEIGHT / height)
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        logger.info(f"Resized to: {new_width}x{new_height}")

    # Convert to RGB if necessary (for PNG with transparency)
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    # Try WebP first for best compression
    output = io.BytesIO()
    image.save(output, format="WEBP", quality=85, method=4)
    webp_bytes = output.getvalue()
    logger.info(f"WebP size: {len(webp_bytes)} bytes")

    # If original was JPEG and WebP is not much smaller, keep JPEG
    if content_type in ("image/jpeg", "image/jpg"):
        # Check if WebP is beneficial
        output_jpg = io.BytesIO()
        image.save(output_jpg, format="JPEG", quality=90, optimize=True)
        jpg_bytes = output_jpg.getvalue()
        logger.info(f"JPEG size: {len(jpg_bytes)} bytes")

        # Use smaller of the two
        if len(jpg_bytes) <= len(webp_bytes):
            return jpg_bytes, "jpg"

    return webp_bytes, "webp"


@router.post("/background/{slot}")
def upload_background(
    slot: str,
    file: UploadFile = File(...),
    _=Depends(require_admin),
):
    logger.info(f"Upload request for slot: {slot}")
    logger.info(f"Content-Type header: {file.content_type}")
    logger.info(f"Filename: {file.filename}")

    if slot not in ALLOWED_SLOTS:
        logger.error(f"Invalid slot: {slot}")
        raise HTTPException(status_code=400, detail="Slot inválido")

    os.makedirs(UPLOADS_DIR, exist_ok=True)

    # Read file content
    try:
        file_content = file.file.read()
        logger.info(f"File size: {len(file_content)} bytes")
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo: {str(e)}")

    try:
        # Open image with Pillow - this validates it's actually an image
        logger.info("Opening image with Pillow...")
        image = Image.open(io.BytesIO(file_content))
        logger.info(f"Image format detected: {image.format}")
        logger.info(f"Image mode: {image.mode}")
        logger.info(f"Image size: {image.size}")

        # Map format to content_type for compression logic
        format_to_mime = {
            "JPEG": "image/jpeg",
            "JPG": "image/jpg",
            "PNG": "image/png",
            "WEBP": "image/webp",
            "GIF": "image/gif",
            "BMP": "image/bmp",
            "TIFF": "image/tiff",
            "AVIF": "image/avif",
            "HEIC": "image/heic",
            "HEIF": "image/heif"
        }
        detected_content_type = format_to_mime.get(image.format, "image/jpeg")
        logger.info(f"Detected content type: {detected_content_type}")

        # Compress image
        logger.info("Compressing image...")
        compressed_bytes, ext = compress_image(image, detected_content_type)
        logger.info(f"Compressed to {ext}: {len(compressed_bytes)} bytes")

        # Remove existing files for this slot
        if os.path.exists(UPLOADS_DIR):
            for fname in os.listdir(UPLOADS_DIR):
                if fname.startswith(f"bg-{slot}."):
                    logger.info(f"Removing old file: {fname}")
                    os.remove(os.path.join(UPLOADS_DIR, fname))

        dest = os.path.join(UPLOADS_DIR, f"bg-{slot}.{ext}")
        with open(dest, "wb") as f:
            f.write(compressed_bytes)
        logger.info(f"Saved to: {dest}")

        return {"url": f"/uploads/bg-{slot}.{ext}"}

    except Exception as e:
        logger.error(f"Error processing image: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error al procesar la imagen: {str(e)}")


@router.get("/background/{slot}/url")
def get_background_url(slot: str):
    if slot not in ALLOWED_SLOTS:
        raise HTTPException(status_code=400, detail="Slot inválido")

    if os.path.exists(UPLOADS_DIR):
        for fname in os.listdir(UPLOADS_DIR):
            if fname.startswith(f"bg-{slot}."):
                return {"url": f"/uploads/{fname}"}

    raise HTTPException(status_code=404, detail="Sin imagen de fondo")


@router.delete("/background/{slot}")
def delete_background(
    slot: str,
    _=Depends(require_admin),
):
    if slot not in ALLOWED_SLOTS:
        raise HTTPException(status_code=400, detail="Slot inválido")

    deleted = False
    if os.path.exists(UPLOADS_DIR):
        for fname in os.listdir(UPLOADS_DIR):
            if fname.startswith(f"bg-{slot}."):
                filepath = os.path.join(UPLOADS_DIR, fname)
                try:
                    os.remove(filepath)
                    logger.info(f"Deleted background image: {filepath}")
                    deleted = True
                except Exception as e:
                    logger.error(f"Failed to delete {filepath}: {e}")
                    raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")

    if not deleted:
        raise HTTPException(status_code=404, detail="No hay imagen para eliminar")

    return {"message": "Imagen eliminada"}
