import firebase_admin
from firebase_admin import credentials, firestore

from app.core.config import settings

# Initialize Firebase only once
if not firebase_admin._apps:
    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)

# Firestore client — importable anywhere in the app
db = firestore.client()
