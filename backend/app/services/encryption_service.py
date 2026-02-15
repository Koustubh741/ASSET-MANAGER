
from cryptography.fernet import Fernet
import os
import sys

# Generate key if not present (fordev/test) but prefer env var
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', Fernet.generate_key().decode())
cipher = Fernet(ENCRYPTION_KEY.encode())

def encrypt_value(plaintext: str) -> str:
    """Encrypt sensitive configuration values"""
    if plaintext is None:
        return None
    return cipher.encrypt(plaintext.encode()).decode()

def decrypt_value(ciphertext: str) -> str:
    """Decrypt sensitive configuration values"""
    if ciphertext is None:
        return None
    try:
        return cipher.decrypt(ciphertext.encode()).decode()
    except Exception:
        # Fallback for unencrypted legacy values if any
        return ciphertext
