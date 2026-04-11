import os
import httpx
import logging
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import create_access_token
from datetime import timedelta
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://expensehub.site").rstrip("/")
BACKEND_URL = os.getenv("BACKEND_URL", "https://expensehub.site/api").rstrip("/")

# Google OAuth Config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = f"{BACKEND_URL}/v1/users/oauth/google/callback"

# Discord OAuth Config
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")
DISCORD_REDIRECT_URI = f"{BACKEND_URL}/v1/users/oauth/discord/callback"


class OAuthService:
	"""Handles OAuth authentication for Google and Discord."""

	# ── Google ──────────────────────────────────────────────
	@staticmethod
	def get_google_auth_url() -> str:
		params = {
			"client_id": GOOGLE_CLIENT_ID,
			"redirect_uri": GOOGLE_REDIRECT_URI,
			"response_type": "code",
			"scope": "openid email profile",
			"access_type": "offline",
			"prompt": "consent",
		}
		return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

	@staticmethod
	async def handle_google_callback(code: str, db: Session) -> str:
		"""Exchange Google auth code for tokens, get user info, create/login user, return JWT."""
		# Exchange code for tokens
		async with httpx.AsyncClient() as client:
			token_response = await client.post(
				"https://oauth2.googleapis.com/token",
				data={
					"client_id": GOOGLE_CLIENT_ID,
					"client_secret": GOOGLE_CLIENT_SECRET,
					"code": code,
					"grant_type": "authorization_code",
					"redirect_uri": GOOGLE_REDIRECT_URI,
				},
			)
			token_data = token_response.json()

			if "error" in token_data:
				logger.error(f"Google token exchange failed: {token_data}")
				raise ValueError(f"Google authentication failed: {token_data.get('error_description', 'Unknown error')}")

			# Get user info
			userinfo_response = await client.get(
				"https://www.googleapis.com/oauth2/v2/userinfo",
				headers={"Authorization": f"Bearer {token_data['access_token']}"},
			)
			userinfo = userinfo_response.json()

		email = userinfo.get("email")
		name = userinfo.get("name", "").replace(" ", "_").lower()
		google_id = userinfo.get("id")
		avatar = userinfo.get("picture", "")

		return OAuthService._find_or_create_oauth_user(
			db, email=email, username=name, oauth_provider="google",
			oauth_id=google_id, avatar_url=avatar
		)

	# ── Discord ─────────────────────────────────────────────
	@staticmethod
	def get_discord_auth_url() -> str:
		params = {
			"client_id": DISCORD_CLIENT_ID,
			"redirect_uri": DISCORD_REDIRECT_URI,
			"response_type": "code",
			"scope": "identify email",
		}
		return f"https://discord.com/api/oauth2/authorize?{urlencode(params)}"

	@staticmethod
	async def handle_discord_callback(code: str, db: Session) -> str:
		"""Exchange Discord auth code for tokens, get user info, create/login user, return JWT."""
		async with httpx.AsyncClient() as client:
			token_response = await client.post(
				"https://discord.com/api/oauth2/token",
				data={
					"client_id": DISCORD_CLIENT_ID,
					"client_secret": DISCORD_CLIENT_SECRET,
					"code": code,
					"grant_type": "authorization_code",
					"redirect_uri": DISCORD_REDIRECT_URI,
				},
				headers={"Content-Type": "application/x-www-form-urlencoded"},
			)
			token_data = token_response.json()

			if "error" in token_data:
				logger.error(f"Discord token exchange failed: {token_data}")
				raise ValueError(f"Discord authentication failed: {token_data.get('error_description', 'Unknown error')}")

			# Get user info
			userinfo_response = await client.get(
				"https://discord.com/api/users/@me",
				headers={"Authorization": f"Bearer {token_data['access_token']}"},
			)
			userinfo = userinfo_response.json()

		email = userinfo.get("email")
		username = userinfo.get("username", "")
		discord_id = str(userinfo.get("id"))
		avatar_hash = userinfo.get("avatar", "")
		avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png" if avatar_hash else ""

		return OAuthService._find_or_create_oauth_user(
			db, email=email, username=username, oauth_provider="discord",
			oauth_id=discord_id, avatar_url=avatar_url
		)

	# ── Shared Helper ───────────────────────────────────────
	@staticmethod
	def _find_or_create_oauth_user(
		db: Session, email: str, username: str,
		oauth_provider: str, oauth_id: str, avatar_url: str
	) -> str:
		"""Find existing user or create new one for OAuth login. Returns JWT."""
		# Look for existing user by oauth_id first
		user = db.query(User).filter(
			User.oauth_provider == oauth_provider,
			User.oauth_id == oauth_id
		).first()

		if not user:
			# Check if email already exists (user signed up with email before)
			user = db.query(User).filter(User.email == email).first()
			if user:
				# Link OAuth to existing account
				user.oauth_provider = oauth_provider
				user.oauth_id = oauth_id
				user.is_verified = True
				if avatar_url and not user.avatar_url:
					user.avatar_url = avatar_url
				db.commit()
			else:
				# Create new user — ensure unique username
				base_username = username[:45] if username else email.split("@")[0]
				final_username = base_username
				counter = 1
				while db.query(User).filter(User.username == final_username).first():
					final_username = f"{base_username}{counter}"
					counter += 1

				user = User(
					email=email,
					username=final_username,
					hashed_password=None,
					oauth_provider=oauth_provider,
					oauth_id=oauth_id,
					avatar_url=avatar_url,
					is_verified=True,
					total_xp=0,
					current_level=0,
					current_streak=0,
					longest_streak=0,
				)
				db.add(user)
				db.commit()
				db.refresh(user)

		# Generate JWT
		access_token = create_access_token(
			data={"sub": user.username},
			expires_delta=timedelta(minutes=30),
		)
		return access_token
