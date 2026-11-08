"""Authentication helpers for the demo application."""
import hashlib
import hmac
import time

SECRET = "demo-only-secret-change-me"

def hash_password(password: str) -> str:
    """Return a SHA-256 digest for this teaching example."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def create_demo_token(user_id: str) -> dict:
    """Create a simplified token-like dictionary (not production JWT)."""
    return {
        "sub": user_id,
        "issued_at": int(time.time()),
        "signature": hmac.new(SECRET.encode(), user_id.encode(), hashlib.sha256).hexdigest(),
    }

def verify_demo_token(token: dict) -> bool:
    user_id = token.get("sub", "")
    expected = hmac.new(SECRET.encode(), user_id.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(token.get("signature", ""), expected)
