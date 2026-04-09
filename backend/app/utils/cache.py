import time
import json
import asyncio
import redis
import os
import logging
from functools import wraps
from typing import Any, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class InMemoryCache:
    """Simple in-memory TTL cache with Redis-like interface."""
    def __init__(self):
        self._store = {}
        self._ttls = {}

    async def get(self, key: str) -> Optional[str]:
        if key in self._store:
            if time.time() < self._ttls.get(key, 0):
                return self._store[key]
            else:
                del self._store[key]
                del self._ttls[key]
        return None

    async def setex(self, key: str, seconds: int, value: str):
        self._store[key] = value
        self._ttls[key] = time.time() + seconds

    async def ping(self):
        return True

class CacheManager:
    """Hybrid Cache Manager: Redis with In-Memory fallback."""
    def __init__(self):
        self._redis_client = None
        self._in_memory_client = InMemoryCache()
        self._redis_url = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL") or "redis://127.0.0.1:6379/0"
        self._use_redis = False

    async def get_client(self):
        if self._use_redis and self._redis_client:
            return self._redis_client
        
        # Try to connect to Redis with extreme short timeouts using ASYNC client
        try:
            import redis.asyncio as async_redis
            client = async_redis.from_url(
                self._redis_url, 
                decode_responses=True, 
                socket_connect_timeout=0.2, 
                socket_timeout=0.2
            )
            # Ping is async now
            if await client.ping():
                self._redis_client = client
                self._use_redis = True
                logger.info(f"--- Cache: Connected to Redis at {self._redis_url} ---")
                return self._redis_client
        except Exception:
            self._use_redis = False
            # logger.debug("--- Cache: Redis unavailable, using In-Memory fallback ---")
            
        return self._in_memory_client

    def cache(self, ttl: int = 300, key_prefix: str = "cache"):
        """Decorator to cache async function results."""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Simple key generation (can be improved for complex args)
                cache_key = f"{key_prefix}:{func.__name__}:{str(args[1:])}:{str(kwargs)}"
                
                client = await self.get_client()
                
                # Try to get from cache
                cached_val = await client.get(cache_key)
                if cached_val:
                    # logger.info(f"--- Cache HIT: {cache_key} ---")
                    try:
                        return json.loads(cached_val)
                    except:
                        return cached_val

                # Execute original function
                result = await func(*args, **kwargs)
                
                # Store in cache
                try:
                    await client.setex(cache_key, ttl, json.dumps(result, default=str))
                except Exception as e:
                    logger.error(f"Cache storage error: {e}")
                    
                return result
            return wrapper
        return decorator

dashboard_cache = CacheManager()


# ─── Phase 5.1: Module-level cache helpers ────────────────────────────────────
# These wrap dashboard_cache for use in routes without the decorator pattern.

async def cache_get(key: str) -> Optional[Any]:
    """Return cached value (deserialized) or None on miss."""
    try:
        client = await dashboard_cache.get_client()
        raw = await client.get(key)
        if raw is not None:
            return json.loads(raw)
    except Exception as e:
        logger.warning("cache_get error for %r: %s", key, e)
    return None


async def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    """Store a serialized value with TTL (seconds)."""
    try:
        client = await dashboard_cache.get_client()
        await client.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.warning("cache_set error for %r: %s", key, e)


async def cache_delete(key: str) -> None:
    """Remove a single key from the cache."""
    try:
        client = await dashboard_cache.get_client()
        if hasattr(client, "delete"):
            await client.delete(key)
        elif hasattr(client, "_store"):
            client._store.pop(key, None)
            client._ttls.pop(key, None)
    except Exception as e:
        logger.warning("cache_delete error for %r: %s", key, e)


async def cache_invalidate_prefix(prefix: str) -> int:
    """
    Delete all keys starting with prefix. Returns number of deleted keys.
    Works with Redis (SCAN) and in-memory fallback.
    """
    count = 0
    try:
        client = await dashboard_cache.get_client()
        # Redis path — use SCAN to find matching keys
        if hasattr(client, "scan"):
            cursor = 0
            to_del = []
            while True:
                cursor, keys = await client.scan(cursor, match=f"{prefix}*", count=100)
                to_del.extend(keys)
                if cursor == 0:
                    break
            if to_del:
                count = await client.delete(*to_del)
        # In-memory path
        elif hasattr(client, "_store"):
            keys_to_del = [k for k in list(client._store.keys()) if k.startswith(prefix)]
            for k in keys_to_del:
                client._store.pop(k, None)
                client._ttls.pop(k, None)
                count += 1
    except Exception as e:
        logger.warning("cache_invalidate_prefix error for %r: %s", prefix, e)
    return count
