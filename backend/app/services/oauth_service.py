"""Google and Discord sign-in using the application's existing user accounts."""

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI = f"{BACKEND_URL}/v1/users/oauth/google/callback"
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "").strip()
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "").strip()
DISCORD_REDIRECT_URI = f"{BACKEND_URL}/v1/users/oauth/discord/callback"
STATE_TTL_SECONDS = 600


class OAuthService:
    @staticmethod
    def require_configured(provider: str) -> None:
        credentials = {
            "google": (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET),
            "discord": (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET),
        }
        if not all(credentials[provider]):
            logger.warning("%s OAuth credentials are not configured", provider)
            raise ValueError(f"{provider}_not_configured")

    @staticmethod
    def create_state(provider: str) -> tuple[str, str]:
        """Bind the redirect to this browser without relying on server memory."""
        state = secrets.token_urlsafe(32)
        cookie = jwt.encode(
            {
                "purpose": "oauth_state",
                "provider": provider,
                "nonce": state,
                "exp": datetime.now(timezone.utc) + timedelta(seconds=STATE_TTL_SECONDS),
            },
            settings.secret_key,
            algorithm=settings.algorithm,
        )
        return state, cookie

    @staticmethod
    def validate_state(provider: str, state: str | None, cookie: str | None) -> None:
        try:
            payload = jwt.decode(cookie or "", settings.secret_key, algorithms=[settings.algorithm])
        except JWTError:
            raise ValueError("invalid_state") from None
        if (
            payload.get("purpose") != "oauth_state"
            or payload.get("provider") != provider
            or not isinstance(payload.get("nonce"), str)
            or not state
            or not secrets.compare_digest(payload["nonce"].encode(), state.encode())
        ):
            raise ValueError("invalid_state")

    @staticmethod
    def get_google_auth_url(state: str) -> str:
        OAuthService.require_configured("google")
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "prompt": "select_account",
            "state": state,
        })

    @staticmethod
    def get_discord_auth_url(state: str) -> str:
        OAuthService.require_configured("discord")
        return "https://discord.com/oauth2/authorize?" + urlencode({
            "client_id": DISCORD_CLIENT_ID,
            "redirect_uri": DISCORD_REDIRECT_URI,
            "response_type": "code",
            "scope": "identify email",
            "state": state,
        })

    @staticmethod
    async def _get_profile(provider: str, code: str) -> dict:
        OAuthService.require_configured(provider)
        if provider == "google":
            client_id, client_secret, redirect_uri = GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
            token_url = "https://oauth2.googleapis.com/token"
            profile_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        else:
            client_id, client_secret, redirect_uri = DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI
            token_url = "https://discord.com/api/oauth2/token"
            profile_url = "https://discord.com/api/users/@me"

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(token_url, data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                })
                response.raise_for_status()
                token = response.json().get("access_token")
                if not isinstance(token, str) or not token:
                    raise ValueError("missing_access_token")
                response = await client.get(profile_url, headers={"Authorization": f"Bearer {token}"})
                response.raise_for_status()
                profile = response.json()
                if not isinstance(profile, dict):
                    raise ValueError("invalid_profile")
                return profile
        except (httpx.HTTPError, ValueError, AttributeError):
            # Provider responses can contain secrets: never log their bodies or URLs.
            logger.warning("%s OAuth token/profile request failed", provider)
            raise ValueError("provider_error") from None

    @staticmethod
    async def handle_google_callback(code: str, db: Session) -> str:
        profile = await OAuthService._get_profile("google", code)
        if profile.get("verified_email") is not True:
            raise ValueError("email_not_verified")
        return OAuthService._find_or_create_oauth_user(
            db, email=profile.get("email"), username=(profile.get("name") or "").replace(" ", "_").lower(),
            oauth_provider="google", oauth_id=profile.get("id"), avatar_url=profile.get("picture", ""),
        )

    @staticmethod
    async def handle_discord_callback(code: str, db: Session) -> str:
        profile = await OAuthService._get_profile("discord", code)
        if profile.get("verified") is not True:
            raise ValueError("email_not_verified")
        discord_id = profile.get("id")
        avatar_hash = profile.get("avatar")
        avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png" if avatar_hash else ""
        return OAuthService._find_or_create_oauth_user(
            db, email=profile.get("email"), username=profile.get("username", ""),
            oauth_provider="discord", oauth_id=discord_id, avatar_url=avatar_url,
        )

    @staticmethod
    def _find_or_create_oauth_user(
        db: Session, email: str, username: str,
        oauth_provider: str, oauth_id: str, avatar_url: str,
    ) -> str:
        if not isinstance(email, str) or "@" not in email or len(email) > 255:
            raise ValueError("email_required")
        if not isinstance(oauth_id, str) or not oauth_id or len(oauth_id) > 255:
            raise ValueError("provider_error")
        email = email.strip().lower()
        user = db.query(User).filter(User.oauth_provider == oauth_provider, User.oauth_id == oauth_id).first()
        if not user:
            # Only a verified provider email may link to an existing password account.
            user = db.query(User).filter(func.lower(User.email) == email).first()
            if not user:
                base_username = (username or email.split("@")[0])[:40]
                final_username = base_username
                counter = 1
                while db.query(User).filter(User.username == final_username).first():
                    final_username = f"{base_username}{counter}"
                    counter += 1
                user = User(email=email, username=final_username, hashed_password=None)
                db.add(user)
            user.oauth_provider = oauth_provider
            user.oauth_id = oauth_id

        user.is_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)
        return create_access_token(data={"sub": user.username})
