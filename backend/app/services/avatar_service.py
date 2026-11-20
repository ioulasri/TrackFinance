"""Avatar uploads via Supabase's S3 API, with legacy Spaces support for migration."""

from dataclasses import dataclass
import logging
import os
from urllib.parse import quote, unquote
import uuid

import boto3
from botocore.client import Config
from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)
MAX_AVATAR_BYTES = 4 * 1024 * 1024  # Leaves room for multipart under Vercel's 4.5 MB limit.
IMAGE_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


@dataclass(frozen=True)
class StorageConfig:
    provider: str
    endpoint: str
    region: str
    bucket: str
    access_key: str
    secret_key: str
    public_url: str


def get_storage_config(provider: str | None = None) -> StorageConfig:
    provider = provider or os.getenv("AVATAR_STORAGE_PROVIDER", "supabase" if os.getenv("SUPABASE_URL") else "digitalocean")
    if provider == "supabase":
        url = os.getenv("SUPABASE_URL", "").rstrip("/")
        bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "avatars")
        config = StorageConfig(
            provider, os.getenv("SUPABASE_S3_ENDPOINT") or (f"{url}/storage/v1/s3" if url else ""),
            os.getenv("SUPABASE_STORAGE_REGION", ""), bucket,
            os.getenv("SUPABASE_S3_ACCESS_KEY_ID", ""), os.getenv("SUPABASE_S3_SECRET_ACCESS_KEY", ""),
            f"{url}/storage/v1/object/public/{quote(bucket, safe='')}" if url else "",
        )
    elif provider == "digitalocean":
        region = os.getenv("DO_SPACES_REGION", "nyc3")
        bucket = os.getenv("DO_SPACES_BUCKET", "")
        config = StorageConfig(
            provider, os.getenv("DO_SPACES_ENDPOINT", f"https://{region}.digitaloceanspaces.com"),
            region, bucket, os.getenv("DO_SPACES_KEY", ""), os.getenv("DO_SPACES_SECRET", ""),
            f"https://{bucket}.{region}.digitaloceanspaces.com",
        )
    else:
        raise ValueError("AVATAR_STORAGE_PROVIDER must be supabase or digitalocean")
    if not all((config.endpoint, config.region, config.bucket, config.access_key, config.secret_key)):
        raise RuntimeError(f"{provider} avatar storage is not configured; see backend/.env.example")
    return config


def object_key_from_url(url: str, config: StorageConfig) -> str | None:
    prefix = config.public_url + "/"
    if not url.startswith(prefix):
        return None
    key = unquote(url[len(prefix):].split("?", 1)[0])
    if not key.startswith("avatars/") or ".." in key.split("/"):
        return None
    return key


class AvatarService:
    @staticmethod
    def get_client(config: StorageConfig | None = None):
        config = config or get_storage_config()
        return boto3.client(
            "s3", region_name=config.region, endpoint_url=config.endpoint,
            aws_access_key_id=config.access_key, aws_secret_access_key=config.secret_key,
            config=Config(
                signature_version="s3v4", s3={"addressing_style": "path"},
                connect_timeout=10, read_timeout=30, retries={"max_attempts": 2},
                request_checksum_calculation="when_required", response_checksum_validation="when_required",
            ),
        )

    @staticmethod
    async def upload_avatar(file: UploadFile, user_id: int) -> str:
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in IMAGE_TYPES or file.content_type != IMAGE_TYPES[ext]:
            raise ValueError("Only JPG, PNG and WebP images are allowed")
        contents = await file.read(MAX_AVATAR_BYTES + 1)
        if not contents or len(contents) > MAX_AVATAR_BYTES:
            raise ValueError("Avatar must be non-empty and under 4 MB")
        config = get_storage_config()
        key = f"avatars/{user_id}/{uuid.uuid4()}.{ext}"
        options = {"ACL": "public-read"} if config.provider == "digitalocean" else {}
        await run_in_threadpool(
            AvatarService.get_client(config).put_object,
            Bucket=config.bucket, Key=key, Body=contents, ContentType=IMAGE_TYPES[ext], **options,
        )
        return f"{config.public_url}/{quote(key, safe='/')}"

    @staticmethod
    def delete_avatar(avatar_url: str):
        try:
            config = get_storage_config()
            key = object_key_from_url(avatar_url, config)
            if key:
                AvatarService.get_client(config).delete_object(Bucket=config.bucket, Key=key)
        except Exception:
            logger.exception("Could not delete old avatar")
