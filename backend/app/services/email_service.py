import resend
import os
import logging
import secrets
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

resend.api_key = os.getenv("RESEND_API_KEY")

FROM_EMAIL = os.getenv("FROM_EMAIL", "TrackFinance <noreply@expensehub.site>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://expensehub.site")

class EmailService:
	
	@staticmethod
	def generate_verification_token() -> tuple[str, datetime]:
		"""Generate a secure random token valid for 24 hours."""

		token = secrets.token_urlsafe(32)
		expires = datetime.now(timezone.utc) + timedelta(hours=24)
		return token, expires
	
	@staticmethod
	def send_verification_email(email: str, username: str, token: str) -> None:
		verify_url = f"{FRONTEND_URL}/verify-email?token={token}"

		try:
			resend.Emails.send({
				"from": FROM_EMAIL,
				"to": email,
				"subject": "Verify your TrackFinance account",
				"html": f"""
				<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
					<div style="text-align:center;margin-bottom:32px;">
						<div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:14px;margin-bottom:16px;">
							<svg width="28" height="28" fill="none" stroke="white" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
							</svg>
						</div>
						<h1 style="font-size:22px;font-weight:700;color:#111827;margin:0;">TrackFinance</h1>
					</div>

					<div style="background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
						<h2 style="font-size:18px;font-weight:600;color:#111827;margin:0 0 8px;">Welcome, {username}!</h2>
						<p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">
							Thanks for signing up. Click the button below to verify your email and activate your account.
						</p>

						<a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:24px;">
							Verify Email Address
						</a>

						<p style="color:#9ca3af;font-size:13px;margin:0;line-height:1.6;">
							This link expires in <strong>24 hours</strong>.
							If you didn't create a TrackFinance account, you can safely ignore this email.
						</p>
					</div>

					<p style="text-align:center;color:#d1d5db;font-size:12px;margin-top:24px;">
						© 2026 TrackFinance · Built by Imad OULASRI
					</p>
				</div>	
				"""
			})
			logger.info(f"Verification email sent to {email}")
		except Exception as e:
			logger.error(f"Failed to send verification email to {email}: {e}")
			# user is already created, they can resend later