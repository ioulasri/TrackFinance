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

	def get_client():
		return boto3.client(
			"s3",
			region_name=DO_SPACES_REGION,
			endpoint_url=DO_SPACES_ENDPOINT,
			aws_access_key_id=DO_SPACES_KEY,
			aws_secret_access_key=DO_SPACES_SECRET,  # ← missing line
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

		client = AvatarService.get_client()
		client.put_object(
			Bucket=DO_SPACES_BUCKET,
			Key=filename,
			Body=contents,
			ContentType=file.content_type,
			ACL="public-read"
		)

		url = f"{DO_SPACES_ENDPOINT}/{DO_SPACES_BUCKET}/{filename}"
		return url

	@staticmethod
	def delete_avatar(avatar_url: str):
		"""Delete old avatar from spaces when user uploads a new one."""
		try:
			if not avatar_url or DO_SPACES_BUCKET not in avatar_url:
				return
			key = avatar_url.split(f"{DO_SPACES_BUCKET}/")[-1]
			client = AvatarService.get_client()
			client.delete_object(Bucket=DO_SPACES_BUCKET, Key=key)
		except Exception:
			pass