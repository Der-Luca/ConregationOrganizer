import secrets
import string
from auth.security import hash_password


ALPHABET = string.ascii_letters + string.digits

def generate_password(length: int = 20) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))

def hash_plain_password(password: str) -> str:
    return hash_password(password[:72])
