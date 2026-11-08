"""Application configuration example."""
import os

APP_NAME = os.getenv("APP_NAME", "Sample Developer Portal")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
PAYMENT_CURRENCY = os.getenv("PAYMENT_CURRENCY", "INR")
