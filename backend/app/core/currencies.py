from typing import Literal

Currency = Literal["MAD", "USD", "EUR", "GBP", "CAD", "AUD", "CHF", "JPY", "CNY", "INR", "AED", "SAR"]
SUPPORTED_CURRENCIES = Currency.__args__
