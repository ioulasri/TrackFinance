"""
Receipt OCR via Groq's vision-capable multimodal model.

Takes raw image bytes, asks the model to extract amount/category/description/
date, returns a structured dict. Errors and parsing failures return {"ok": False}
so callers can degrade gracefully.

Model is configurable via VISION_MODEL env var; defaults to a Groq-hosted
Llama 4 multimodal checkpoint.
"""

from __future__ import annotations

import base64
import json
import os
import re
from typing import Any, Dict, Optional

from groq import Groq, RateLimitError, APIStatusError


# Llama 4 vision models on Groq (current as of late 2025).
DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


# Same canonical list the wizards use, kept in sync with frontend modal.
ALLOWED_CATEGORIES = [
	"Food & Dining", "Transportation", "Shopping", "Bills & Utilities",
	"Entertainment", "Healthcare", "Education", "Electronics", "Other",
]


VISION_SYSTEM_PROMPT = (
	"You extract structured data from receipt or invoice photos. "
	"Reply with ONE compact JSON object, nothing else — no prose, no code fences. "
	"Schema: {\"amount\": number, \"category\": string, \"description\": string, "
	"\"date\": \"YYYY-MM-DD\" | null, \"confidence\": \"high\"|\"medium\"|\"low\"}. "
	f"Pick category from this list when possible: {ALLOWED_CATEGORIES}. "
	"`amount` is the GRAND TOTAL in the receipt's currency (do not convert). "
	"`description` is the merchant or short summary (max 60 chars). "
	"If the image isn't a receipt or you can't read it, return "
	"{\"ok\": false, \"reason\": \"…\"}."
)


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
	# Strip code fences if the model added any.
	text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
	# Find the first {...} block.
	match = re.search(r"\{.*\}", text, re.DOTALL)
	if not match:
		return None
	try:
		return json.loads(match.group(0))
	except json.JSONDecodeError:
		return None


def extract_receipt(image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
	"""
	Send the image to Groq vision and return a normalized dict:
	  {"ok": True, "amount": float, "category": str, "description": str,
	   "date": str | None, "confidence": str}
	or {"ok": False, "reason": str} on any failure / unparseable receipt.
	"""
	api_key = os.getenv("GROQ_API_KEY")
	if not api_key:
		return {"ok": False, "reason": "AI service not configured on the server."}

	model = os.getenv("VISION_MODEL", DEFAULT_VISION_MODEL)
	b64 = base64.b64encode(image_bytes).decode("ascii")
	data_url = f"data:{mime_type};base64,{b64}"

	try:
		client = Groq(api_key=api_key)
		completion = client.chat.completions.create(
			model=model,
			messages=[
				{"role": "system", "content": VISION_SYSTEM_PROMPT},
				{
					"role": "user",
					"content": [
						{"type": "text", "text": "Extract from this receipt."},
						{"type": "image_url", "image_url": {"url": data_url}},
					],
				},
			],
			temperature=0.2,
			max_tokens=400,
		)
		raw = completion.choices[0].message.content or ""
	except RateLimitError:
		return {"ok": False, "reason": "AI is busy — try again in a minute, or use /add."}
	except APIStatusError as e:
		return {"ok": False, "reason": f"Vision API error ({e.status_code})."}
	except Exception as e:
		print(f"[vision] unexpected error: {e}")
		return {"ok": False, "reason": "Couldn't process the image."}

	parsed = _extract_json(raw)
	if not parsed:
		return {"ok": False, "reason": "Couldn't parse the receipt."}
	if parsed.get("ok") is False:
		return {"ok": False, "reason": parsed.get("reason") or "Not a recognizable receipt."}

	# Normalize / validate
	try:
		amount = float(parsed["amount"])
		if amount <= 0:
			raise ValueError("non-positive")
	except (KeyError, TypeError, ValueError):
		return {"ok": False, "reason": "Couldn't read the total amount."}

	category = str(parsed.get("category") or "Other").strip()[:50]
	description = str(parsed.get("description") or "Receipt").strip()[:60]
	date_raw = parsed.get("date")
	date = date_raw if isinstance(date_raw, str) and re.match(r"^\d{4}-\d{2}-\d{2}$", date_raw) else None
	confidence = str(parsed.get("confidence") or "medium").lower()

	return {
		"ok": True,
		"amount": amount,
		"category": category,
		"description": description,
		"date": date,
		"confidence": confidence,
	}
