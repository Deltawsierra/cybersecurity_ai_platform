from typing import Callable, Dict, Any, List, Optional
import threading
import hashlib
import json
from . import utils

_PLUGINS: Dict[str, Callable[..., List[Dict[str, Any]]]] = {}
_LOCK = threading.Lock()


def register_plugin(name: str):
    """
    Decorator to register a plugin by name.
    Plugin signature: fn(items: List[dict], use_llm: bool=False, redact: bool=True, tenant: Optional[str]=None) -> List[dict]
    """
    def _wrap(fn: Callable[..., List[Dict[str, Any]]]):
        with _LOCK:
            _PLUGINS[name] = fn
        return fn
    return _wrap


def get_plugin(name: str) -> Optional[Callable[..., List[Dict[str, Any]]]]:
    return _PLUGINS.get(name)


def _hash_key(namespace: str, payload: Any, tenant: Optional[str]) -> str:
    h = hashlib.sha256()
    h.update(namespace.encode("utf-8"))
    if tenant:
        h.update(str(tenant).encode("utf-8"))
    # stable json serialization
    h.update(json.dumps(payload, sort_keys=True, default=str).encode("utf-8"))
    return h.hexdigest()


def annotate(namespace: str, items: List[Dict[str, Any]],
             use_llm: bool = False,
             redact: bool = True,
             tenant: Optional[str] = None,
             cache_ttl: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Main entrypoint used by your views:
      annotated = annotate("pentest_findings", findings, use_llm=False, redact=True, tenant=str(user.id))

    - namespace: string to pick plugin
    - items: list of dicts (scanner / detection outputs)
    - use_llm: pass-through to plugin
    - redact: whether to request plugin to redact sensitive fields
    - tenant: optional tenant id for caching / multi-tenant behavior
    - cache_ttl: optional seconds for caching (None uses default from utils)
    """
    plugin = get_plugin(namespace)
    if plugin is None:
        raise RuntimeError(f"No AI plugin registered for namespace='{namespace}'")

    # Optionally redact items before caching / plugin (lightweight)
    safe_items = [utils.redact_item(i) if redact else i for i in items]

    # Try cache
    cache_backend = utils.get_cache_backend()
    key = _hash_key(namespace, safe_items, tenant)
    cached = cache_backend.get(key)
    if cached is not None:
        return cached

    # call plugin (plugin decides whether to call external LLM)
    out = plugin(safe_items, use_llm=use_llm, redact=redact, tenant=tenant)

    # plugin expected to return list-like; store in cache (deep-copy safe)
    cache_backend.set(key, out, ttl=cache_ttl or utils.DEFAULT_CACHE_TTL)
    return out
