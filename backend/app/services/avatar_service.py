import boto3
from botocore.client import Config
from fastapi import UploadFile
import uuid
import os

DO_SPACES_KEY = os.getenv("DO_SPACES_KEY")
DO_SPACES_SECRET = os.getenv("DO_SPACES_SECRET")
DO_SPACES_REGION = os.getenv("DO_SPACES_REGION", "nyc3")
DO_SPACES_BUCKET = os.getenv("DO_SPACES_BUCKET")
DO_SPACES_ENDPOINT = os.getenv("DO_SPACES_ENDPOINT", f"https://{os.getenv('DO_SPACES_REGION', 'nyc3')}.digitaloceanspaces.com")


class AvatarService:
    @staticmethod
    def validate_config():
        """Validate that all required DO Spaces environment variables are set."""
        missing = []
        if not DO_SPACES_KEY: missing.append("DO_SPACES_KEY")
        if not DO_SPACES_SECRET: missing.append("DO_SPACES_SECRET")
        if not DO_SPACES_BUCKET: missing.append("DO_SPACES_BUCKET")
        
        if missing:
            raise ValueError(f"Missing required DigitalOcean Spaces configuration: {', '.join(missing)}")

    @staticmethod
    def get_client():
        AvatarService.validate_config()
        return boto3.client(
            "s3",
            region_name=DO_SPACES_REGION,
            endpoint_url=DO_SPACES_ENDPOINT,
            aws_access_key_id=DO_SPACES_KEY,
            aws_secret_access_key=DO_SPACES_SECRET,
            config=Config(signature_version="s3v4")
        )
    
    @staticmethod
    async def upload_avatar(file: UploadFile, user_id: int) -> str:
        """Upload avatar to DigitalOcean spaces and return public URL."""
        ext = file.filename.split(".")[-1].lower()

        if ext not in ["jpg", "jpeg", "png", "webp"]:
            raise ValueError("Only jpg, jpeg, png and webp files are allowed")

        filename = f"avatars/{user_id}/{uuid.uuid4()}.{ext}"
        contents = await file.read()

        try:
            client = AvatarService.get_client()
            client.put_object(
                Bucket=DO_SPACES_BUCKET,
                Key=filename,
                Body=contents,
                ContentType=file.content_type,
                ACL="public-read"
            )

            # Standard DigitalOcean Spaces public URL format
            # Using the format: https://bucket.region.digitaloceanspaces.com/filename
            url = f"https://{DO_SPACES_BUCKET}.{DO_SPACES_REGION}.digitaloceanspaces.com/{filename}"
            return url
        except Exception as e:
            # Re-raise with a more descriptive message if it's a boto3 error
            raise Exception(f"S3/Spaces error: {str(e)}")

    @staticmethod
    def delete_avatar(avatar_url: str):
        """Delete old avatar from spaces when user uploads a new one."""
        try:
            if not avatar_url or not DO_SPACES_BUCKET or DO_SPACES_BUCKET not in avatar_url:
                return
            key = avatar_url.split(f"{DO_SPACES_REGION}.digitaloceanspaces.com/")[-1]
            if "/" not in key: # Fallback for old URL format if any
                key = avatar_url.split(f"{DO_SPACES_BUCKET}/")[-1]
                
            client = AvatarService.get_client()
            client.delete_object(Bucket=DO_SPACES_BUCKET, Key=key)
        except Exception:
            pass