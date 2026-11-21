from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserResponse, UserStatsResponse, UserLogin, Token, UserPasswordChange, UserPasswordReset, ResendVerificationRequest, CycleStartDayRequest, UserUpdate, UserUpdateResponse
from app.services.user_service import UserService
from app.services.oauth_service import OAuthService, BACKEND_URL, STATE_TTL_SECONDS
from app.api.dependencies import get_current_user
from app.models.user import User
from app.core.security import create_access_token
from datetime import timedelta
from app.services.xp_service import XPService
from app.schemas.user import UserStatsResponse
import os
import logging
from urllib.parse import urlencode
from app.services.avatar_service import AvatarService, MAX_AVATAR_BYTES
from starlette.concurrency import run_in_threadpool
from fastapi import File, UploadFile

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://expensehub.site").rstrip("/")
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/users", tags=["users"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
	
	try:
		new_user = UserService.create_user(db, user_data)
		return new_user
	except ValueError as e:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=str(e)
		)

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(reset_data: UserPasswordReset, db: Session = Depends(get_db)):
	try:
		UserService.reset_forgotten_password(
			db=db,
			username=reset_data.username,
			old_password=reset_data.old_password,
			new_password=reset_data.new_password
		)
		return {"message": "Password has been successfully reset."}
	except ValueError as e:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=str(e)
		)

@router.post("/login", response_model=Token)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):

	try:
		user = UserService.authenticate_user(db, credentials.username, credentials.password)
	except ValueError as e:
		if str(e) == "EMAIL_NOT_VERIFIED":
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="EMAIL_NOT_VERIFIED"
			)
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=str(e)
		)

	if not user:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Incorrect username or password",
			headers={"WWW-Authenticate": "Bearer"}	
		)
	
	access_token = create_access_token(
		data={"sub": user.username},
		expires_delta=timedelta(minutes=30)
	)

	return Token(access_token=access_token, token_type="bearer")

@router.get("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
	"""Called when the user clicks the link in their email."""
	try:
		UserService.verify_email(db, token)
		return {"message": "Email Verified successfully. You can now log in"}
	except ValueError as e:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/resend-verification", status_code=status.HTTP_200_OK)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
	"""Resend the verification email. Always 200 to avoid leaking whether an email exists."""
	try:
		UserService.resend_verification(db, payload.email)
	except ValueError as e:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
	return {"message": "If that email is registed and unverified, a new link has been sent"}

# OAuth state lives in a signed, browser-bound cookie so callbacks work across
# different Vercel function instances without a server-side session store.
def _oauth_redirect(provider: str, *, token: str | None = None, error: str | None = None):
	# Fragments stay in the browser; the login JWT never enters frontend request logs.
	suffix = "#" + urlencode({"token": token}) if token else "?" + urlencode({"error": error})
	response = RedirectResponse(f"{FRONTEND_URL}/oauth-callback{suffix}")
	response.headers["Cache-Control"] = "no-store"
	response.headers["Referrer-Policy"] = "no-referrer"
	response.delete_cookie(f"tf_oauth_{provider}", path=f"/v1/users/oauth/{provider}/callback")
	return response


def _oauth_login(provider: str):
	try:
		OAuthService.require_configured(provider)
		state, cookie = OAuthService.create_state(provider)
		get_url = getattr(OAuthService, f"get_{provider}_auth_url")
		response = RedirectResponse(get_url(state))
		response.headers["Cache-Control"] = "no-store"
		response.headers["Referrer-Policy"] = "no-referrer"
		response.set_cookie(
			f"tf_oauth_{provider}", cookie, max_age=STATE_TTL_SECONDS,
			path=f"/v1/users/oauth/{provider}/callback",
			httponly=True, secure=BACKEND_URL.startswith("https://"), samesite="lax",
		)
		return response
	except ValueError as exc:
		return _oauth_redirect(provider, error=str(exc))


async def _oauth_callback(provider: str, request: Request, db: Session):
	try:
		OAuthService.validate_state(provider, request.query_params.get("state"), request.cookies.get(f"tf_oauth_{provider}"))
		issuer = request.query_params.get("iss")
		if issuer and issuer != {"google": "https://accounts.google.com", "discord": "https://discord.com"}[provider]:
			raise ValueError("invalid_state")
		if request.query_params.get("error"):
			raise ValueError("access_denied" if request.query_params["error"] == "access_denied" else "provider_error")
		code = request.query_params.get("code")
		if not code:
			raise ValueError("missing_code")
		handle_callback = getattr(OAuthService, f"handle_{provider}_callback")
		token = await handle_callback(code, db)
		return _oauth_redirect(provider, token=token)
	except ValueError as exc:
		db.rollback()
		return _oauth_redirect(provider, error=str(exc))
	except Exception as exc:
		db.rollback()
		logger.error("%s OAuth callback failed (%s)", provider, type(exc).__name__)
		return _oauth_redirect(provider, error="login_failed")


@router.get("/oauth/google")
def google_login():
	"""Redirect user to Google's OAuth consent screen."""
	return _oauth_login("google")

@router.get("/oauth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
	"""Handle Google OAuth callback."""
	return await _oauth_callback("google", request, db)

# ── OAuth: Discord ──────────────────────────────────────────
@router.get("/oauth/discord")
def discord_login():
	"""Redirect user to Discord's OAuth consent screen."""
	return _oauth_login("discord")

@router.get("/oauth/discord/callback")
async def discord_callback(request: Request, db: Session = Depends(get_db)):
	"""Handle Discord OAuth callback."""
	return await _oauth_callback("discord", request, db)

@router.get("/me", response_model=UserResponse)
def get_current_user_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	return current_user

@router.patch("/me", response_model=UserUpdateResponse)
def update_current_user(
	update_data: UserUpdate,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	old_username = current_user.username
	try:
		updated = UserService.update_user(
			db, current_user,
			username=update_data.username,
			telegram_notifications_enabled=update_data.telegram_notifications_enabled,
		)
	except ValueError as e:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

	# If the username changed the existing JWT is now invalid (sub no longer matches).
	# Issue a fresh token so the client can continue without being logged out.
	new_token = None
	if updated.username != old_username:
		new_token = create_access_token(
			data={"sub": updated.username},
			expires_delta=timedelta(minutes=30)
		)

	return UserUpdateResponse(
		id=updated.id,
		username=updated.username,
		email=updated.email,
		total_xp=updated.total_xp,
		current_level=updated.current_level,
		current_xp=updated.current_xp,
		current_streak=updated.current_streak,
		longest_streak=updated.longest_streak,
		created_at=updated.created_at,
		avatar_url=updated.avatar_url,
		access_token=new_token,
	)

@router.put("/me/password", status_code=status.HTTP_200_OK)
def change_password(
	password_data: UserPasswordChange,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	try:
		UserService.change_password(
			db=db,
			user=current_user,
			current_password=password_data.current_password,
			new_password=password_data.new_password
		)
		return {"message": "Password updated successfully"}
	except ValueError as e:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=str(e)
		)

@router.get("/me/stats", response_model=UserStatsResponse)
def get_current_user_stats(current_user: User = Depends(get_current_user)):
	next_level_up = XPService.get_xp_for_next_level(current_user.current_level)
	xp_needed = next_level_up - current_user.total_xp
	progress_pct = (current_user.total_xp / next_level_up) * 100

	return {
		"user_id": current_user.id,
		"username": current_user.username,
		"total_xp": current_user.total_xp,
		"current_level": current_user.current_level,
		"current_streak": current_user.current_streak,
		"current_xp": current_user.current_xp,
		"longest_streak": current_user.longest_streak,
		"xp_to_next_level": xp_needed,
		"level_progress_percentage": progress_pct
	}
@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
	file: UploadFile = File(...),
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	if file.size and file.size > MAX_AVATAR_BYTES:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="File size must be under 4 MB"
		)

	try:
		old_url = current_user.avatar_url
		url = await AvatarService.upload_avatar(file, current_user.id)

		current_user.avatar_url = url
		db.commit()
		db.refresh(current_user)
		if old_url:
			await run_in_threadpool(AvatarService.delete_avatar, old_url)

		return current_user

	except ValueError as e:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
	except Exception as e:
		db.rollback()
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload avatar; check storage configuration")
