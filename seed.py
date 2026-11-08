"""Create a demo developer bank and seed a few learning memories."""
import os
from dotenv import load_dotenv
from hindsight_client import Hindsight

load_dotenv()

client = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL", "https://api.hindsight.vectorize.io"),
    api_key=os.getenv("HINDSIGHT_API_KEY"),
)

BANK_ID = "developer-demo-developer"

def main():
    try:
        client.create_bank(bank_id=BANK_ID, name="Demo Developer")
    except Exception as exc:
        message = str(exc).lower()
        if not any(word in message for word in ("exist", "already", "409", "conflict")):
            raise

    memories = [
        "Explained: auth.py password hashing | Concepts taught: hashing, SHA-256 | User confused by: None stated | Persona: Friendly Mentor",
        "Explained: auth.py demo token creation | Concepts taught: token, signature, user ID | User confused by: difference between token and password | Persona: Friendly Mentor",
        "Explained: database.py in-memory storage | Concepts taught: dictionary, key-value lookup, persistence limitation | User confused by: None stated | Persona: Friendly Mentor",
    ]
    for memory in memories:
        client.retain(
            bank_id=BANK_ID,
            content=memory,
            context="Seeded onboarding learning history",
        )
    print(f"Seeded {len(memories)} memories into {BANK_ID}")

if __name__ == "__main__":
    main()
