import os
from dotenv import load_dotenv

load_dotenv()

# Firebase Config
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
FIREBASE_AUTH_DOMAIN = os.getenv("FIREBASE_AUTH_DOMAIN")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET")
FIREBASE_MESSAGING_SENDER_ID = os.getenv("FIREBASE_MESSAGING_SENDER_ID")
FIREBASE_APP_ID = os.getenv("FIREBASE_APP_ID")

# Backend Config
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
API_PORT = int(os.getenv("API_PORT", 8000))
API_HOST = os.getenv("API_HOST", "0.0.0.0")

# Dataset Config
DATASET_PATH = os.getenv("DATASET_PATH", "./data/metadataset.csv")
AUDIO_BASE_PATH = os.getenv("AUDIO_BASE_PATH", "/content/dataset")
GOOGLE_DRIVE_PATH = os.getenv("GOOGLE_DRIVE_PATH", "/content/drive/MyDrive/DATASET")

# CORS Config
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3001,http://localhost:3000").split(",")
