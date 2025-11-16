"""
Utilities for the AI engine: redaction and pluggable cache backend.
Default cache is simple in-memory dict; optionally use redis if configured.
"""
import os
import re
import json
import time
from typing import Any, Dict, Optional

# default TTL for cache entries
DEFAULT_CACHE_TTL = 60 * 60 * 24  # 1 day

# --- Redaction helpers ------------------------------------------------------
SENSITIVE_PATTERNS = [
    re.compile(r"(?i)apikey\s*[:=]\s*['\"]?[A-Za-z0-9\-_]{16,}['\"]?"),
    re.compile(r"(?i)secret\s*[:=]\s*['\"][^'\"]{6,}['\"]"),
    re.compile(r"(?i)password\s*[:=]\s*['\"][^'\"]{3,}['\"]"),
    re.compile(r"AKIA[0-9A-Z]{16}"),  # AWS-like
]


def redact_text(s: str, placeholder: str = "<REDACTED>") -> str:
    if not s:
        return s
    out = s
    for rx in SENSITIVE_PATTERNS:
        out = rx.sub(placeholder, out)
    # remove long token-looking sequences (basic)
    out = re.sub(r"[A-Za-z0-9\-_]{40,}", "<REDACTED_TOKEN>", out)
    return out


def redact_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Redact common fields in a finding-like dict.
    Shallow copy then sanitize suspicious strings (evidence/payload/details).
    """
    copy = dict(item)
    # fields to redact heuristically
    for fld in ("evidence", "payload", "details"):
        if fld in copy and copy[fld]:
            try:
                # details might be dict -> stringify then redact
                if isinstance(copy[fld], (dict, list)):
                    text = json.dumps(copy[fld], default=str)
                    text = redact_text(text)
                    # keep as string to avoid storing secrets
                    copy[fld] = text
                else:
                    copy[fld] = redact_text(str(copy[fld]))
            except Exception:
                copy[fld] = "<REDACTED>"
    # also sanitize url fields if they carry tokens
    if "url" in copy and copy["url"]:
        copy["url"] = redact_text(str(copy["url"]))
    return copy


# --- Simple cache backends --------------------------------------------------
class MemoryCache:
    def __init__(self):
        self._store = {}
        self._meta = {}

    def get(self, key: str):
        m = self._meta.get(key)
        if not m:
            return None
        if m.get("expires_at") and m["expires_at"] < time.time():
            # expired
            self._store.pop(key, None)
            self._meta.pop(key, None)
            return None
        return self._store.get(key)

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        self._store[key] = value
        meta = {}
        if ttl:
            meta["expires_at"] = time.time() + ttl
        self._meta[key] = meta

    def clear(self):
        self._store.clear()
        self._meta.clear()


# If REDIS_URL env var set, use redis-backend
def get_cache_backend():
    redis_url = os.environ.get("AI_ENGINE_REDIS_URL") or os.environ.get("REDIS_URL")
    if redis_url:
        try:
            import redis
            class RedisCacheWrapper:
                def __init__(self, url):
                    self.client = redis.from_url(url)
                def get(self, key):
                    v = self.client.get(key)
                    if v is None:
                        return None
                    return json.loads(v)
                def set(self, key, value, ttl=None):
                    v = json.dumps(value, default=str)
                    if ttl:
                        self.client.setex(key, ttl, v)
                    else:
                        self.client.set(key, v)
                def clear(self):
                    self.client.flushdb()
            return RedisCacheWrapper(redis_url)
        except Exception:
            # fallback to memory cache if redis not installed/available
            return MemoryCache()
    return MemoryCache()
