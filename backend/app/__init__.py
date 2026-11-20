"""Load local backend configuration before services read environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

if os.getenv("TESTING") != "1":
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
