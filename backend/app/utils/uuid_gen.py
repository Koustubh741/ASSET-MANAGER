import uuid
import time
import os

try:
    import uuid_utils as uuid7_gen
    HAS_UUID7_LIB = True
except ImportError:
    HAS_UUID7_LIB = False

def _generate_uuid7_pure_python():
    """
    Generate a time-ordered UUIDv7 in pure Python (RFC 9562 fallback).
    Format: 48 bits (timestamp) + 4 bits (version 7) + 12 bits (rand_a) + 2 bits (variant) + 62 bits (rand_b)
    """
    # 48-bit timestamp (milliseconds since epoch)
    nanoseconds = time.time_ns()
    timestamp_ms = nanoseconds // 1_000_000
    
    # 12-bit rand_a
    rand_a = int.from_bytes(os.urandom(2), byteorder='big') & 0x0FFF
    
    # 62-bit rand_b
    rand_b = int.from_bytes(os.urandom(8), byteorder='big') & 0x3FFFFFFFFFFFFFFF
    
    # Assemble bits
    # Version 7 is 0111 (0x7)
    # Variant is 10 (0x2)
    
    # timestamp_ms (48 bits) << 80
    # | (0x7 << 76)  # Version
    # | (rand_a << 64)
    # | (0x2 << 62)  # Variant
    # | rand_b
    
    uuid_int = (timestamp_ms << 80) | (0x7 << 76) | (rand_a << 64) | (0x2 << 62) | rand_b
    return uuid.UUID(int=uuid_int)

def get_uuid():
    """
    Generate a time-ordered UUIDv7.
    UUIDv7 provides the uniqueness of a UUID while being lexicographicaly sortable 
    by creation time, which optimizes database index performance.
    """
    if HAS_UUID7_LIB:
        try:
            # Root Fix: Cast to standard lib uuid.UUID to satisfy asyncpg strict type binding
            return uuid.UUID(str(uuid7_gen.uuid7()))
        except Exception:
            # If lib fails for any reason, use pure python fallback
            return _generate_uuid7_pure_python()
    return _generate_uuid7_pure_python()

def get_uuid_str():
    """
    Generate a time-ordered UUIDv7 and return its string representation.
    """
    return str(get_uuid())
