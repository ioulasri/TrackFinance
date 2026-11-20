"""Authenticated HTTP entrypoints for Supabase Cron; never start detached work."""

import hmac
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.scheduler_service import run_job

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal/jobs", tags=["scheduled jobs"])


def require_cron_secret(authorization: Optional[str] = Header(default=None)) -> None:
    secret = os.getenv("CRON_SECRET", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Scheduled jobs are not configured")
    if not authorization or not hmac.compare_digest(authorization.encode(), f"Bearer {secret}".encode()):
        raise HTTPException(status_code=401, detail="Invalid job credentials")


@router.post("/{job_name}", dependencies=[Depends(require_cron_secret)])
def scheduled_job(job_name: str, db: Session = Depends(get_db)):
    if job_name not in {"hourly", "weekly-digest"}:
        raise HTTPException(status_code=404, detail="Unknown scheduled job")
    try:
        return run_job(db, job_name)
    except Exception:
        db.rollback()
        logger.exception("Scheduled job %s failed", job_name)
        raise HTTPException(status_code=500, detail="Scheduled job failed; check backend logs")
