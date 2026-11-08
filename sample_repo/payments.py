"""Toy payment flow for explaining application structure."""
from database import save_payment

def create_payment(user_id: str, amount: float) -> dict:
    if amount <= 0:
        raise ValueError("Payment amount must be positive")
    payment = {
        "user_id": user_id,
        "amount": round(amount, 2),
        "currency": "INR",
        "status": "pending",
    }
    return save_payment(payment)

def mark_payment_complete(payment_id: str) -> dict:
    return {"payment_id": payment_id, "status": "completed"}
