"""Extract a receipt draft. Saving always uses the normal transaction endpoint."""
import io
import warnings

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.vision_service import extract_receipt

router = APIRouter(prefix="/v1/receipts", tags=["receipts"])
MAX_RECEIPT_BYTES = 4 * 1024 * 1024
FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


def validate_image(data: bytes) -> str:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in FORMATS:
                    raise HTTPException(415, "Use a JPG, PNG or WebP receipt image.")
                if image.width * image.height > 20_000_000:
                    raise HTTPException(413, "Receipt image is too large. Use an image under 20 megapixels.")
                mime = FORMATS[image.format]
                image.verify()
                return mime
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, "This image could not be read. Choose another receipt photo.") from None


@router.post("/scan")
async def scan_receipt(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    try:
        data = await file.read(MAX_RECEIPT_BYTES + 1)
    finally:
        await file.close()
    if not data:
        raise HTTPException(422, "Choose a receipt image first.")
    if len(data) > MAX_RECEIPT_BYTES:
        raise HTTPException(413, "Receipt images must be smaller than 4 MB.")
    mime = await run_in_threadpool(validate_image, data)
    result = await run_in_threadpool(extract_receipt, data, mime)
    if not result.get("ok"):
        raise HTTPException(422, result.get("reason", "Could not read this receipt."))
    return {**result, "account_currency": user.currency}
