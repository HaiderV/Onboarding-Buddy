"""A simplified request middleware example."""
from auth import verify_demo_token

def require_auth(request: dict) -> dict:
    token = request.get("token")
    if not token or not verify_demo_token(token):
        return {"allowed": False, "status_code": 401}
    return {"allowed": True, "user_id": token["sub"]}
