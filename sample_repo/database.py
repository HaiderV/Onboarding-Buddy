"""In-memory storage used by the sample codebase."""
_USERS = {}
_PAYMENTS = {}

def save_user(user: dict) -> dict:
    _USERS[user["id"]] = user
    return user

def get_user(user_id: str):
    return _USERS.get(user_id)

def save_payment(payment: dict) -> dict:
    payment_id = f"pay_{len(_PAYMENTS) + 1}"
    payment["id"] = payment_id
    _PAYMENTS[payment_id] = payment
    return payment

def get_payment(payment_id: str):
    return _PAYMENTS.get(payment_id)
