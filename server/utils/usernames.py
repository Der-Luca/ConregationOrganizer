import re
import unicodedata
from sqlalchemy.orm import Session
from models.user import User


def slugify_username(name: str) -> str:
    """
    Convert a name to a URL-safe username slug.
    "José García" -> "jose-garcia"
    "Anna-Marie" -> "anna-marie"
    """
    # Normalize unicode characters (remove accents)
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")

    # Convert to lowercase
    lower = ascii_name.lower()

    # Replace spaces and underscores with hyphens
    hyphenated = re.sub(r"[\s_]+", "-", lower)

    # Remove any characters that aren't alphanumeric or hyphens
    cleaned = re.sub(r"[^a-z0-9-]", "", hyphenated)

    # Remove multiple consecutive hyphens
    single_hyphen = re.sub(r"-+", "-", cleaned)

    # Strip leading/trailing hyphens
    return single_hyphen.strip("-")


def generate_unique_username(base: str, db: Session) -> str:
    """
    Generate a unique username from a base string.
    If the base already exists, append a number (base1, base2, etc.)
    """
    slug = slugify_username(base)

    # Check if the base slug is available
    if not db.query(User).filter(User.username == slug).first():
        return slug

    # Find a unique variant by appending numbers
    counter = 1
    while True:
        candidate = f"{slug}{counter}"
        if not db.query(User).filter(User.username == candidate).first():
            return candidate
        counter += 1


def is_username_available(username: str, db: Session) -> bool:
    """Check if a username is available."""
    return not db.query(User).filter(User.username == username).first()


def get_suggested_username(base: str, db: Session) -> str:
    """Get a suggested available username based on the given base."""
    return generate_unique_username(base, db)
