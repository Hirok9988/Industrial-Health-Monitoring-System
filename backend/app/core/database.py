import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Firebase only once
if not firebase_admin._apps:
    cred_path = None
    
    # Priority 1: Render Secret Files standard location
    render_secret_path = "/etc/secrets/firebase-credentials.json"
    if os.path.exists(render_secret_path):
        cred_path = render_secret_path
        logger.info(f"Firebase credentials loaded from Render Secret File: {render_secret_path}")
    # Priority 2: Configured FIREBASE_CREDENTIALS_PATH (local development or custom env)
    elif os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        logger.info(f"Firebase credentials loaded from path: {cred_path}")
    # Priority 3: Check relative to project root if executed from backend/ or parent directory
    elif os.path.exists(os.path.join(os.path.dirname(__file__), "..", "..", settings.FIREBASE_CREDENTIALS_PATH)):
        cred_path = os.path.join(os.path.dirname(__file__), "..", "..", settings.FIREBASE_CREDENTIALS_PATH)
        logger.info(f"Firebase credentials loaded from relative path: {cred_path}")
    else:
        raise FileNotFoundError(
            f"Firebase service account credentials not found. Looked in '{render_secret_path}' "
            f"and '{settings.FIREBASE_CREDENTIALS_PATH}'."
        )

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

# Firestore client — importable anywhere in the app
db = firestore.client()
