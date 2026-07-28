"""Upload de arquivos para Vercel Blob."""
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, status

from app.core.config import settings

router = APIRouter(prefix="/upload", tags=["upload"])

BLOB_API = "https://blob.vercel-storage.com"
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("")
async def upload_file(file: UploadFile):
    if not settings.BLOB_READ_WRITE_TOKEN:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Storage não configurado.")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Arquivo excede 10 MB.")

    filename = file.filename or "attachment"
    content_type = file.content_type or "application/octet-stream"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.put(
            f"{BLOB_API}/{filename}",
            content=data,
            headers={
                "Authorization": f"Bearer {settings.BLOB_READ_WRITE_TOKEN}",
                "x-api-version": "7",
                "x-content-type": content_type,
            },
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Blob error: {resp.text}")

    blob = resp.json()
    return {"url": blob["url"], "pathname": blob.get("pathname", filename)}
