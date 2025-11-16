from ai_engine.core import register_plugin
from typing import List, Dict, Any, Optional
import importlib

_alerts_annotate = None
try:
    mod = importlib.import_module("alerts.ai_engine")
    _alerts_annotate = getattr(mod, "annotate_alerts", None)
except Exception:
    _alerts_annotate = None

def _fallback_alerts_annotate(items, use_llm=False):
    out = []
    for a in items:
        a2 = dict(a)
        a2.setdefault("ai_summary", a2.get("message") or a2.get("title") or "Alert")
        a2.setdefault("suggested_remediation", a2.get("details", {}).get("remediation"))
        a2.setdefault("ai_confidence", 0.5)
        out.append(a2)
    return out

@register_plugin("alerts")
def alerts_plugin(items: List[Dict[str, Any]], use_llm: bool=False, redact: bool=True, tenant: Optional[str]=None) -> List[Dict[str, Any]]:
    annotator = _alerts_annotate or _fallback_alerts_annotate
    enriched = annotator(items, use_llm=use_llm) if callable(annotator) else _fallback_alerts_annotate(items, use_llm=use_llm)
    for e in enriched:
        e.setdefault("ai_summary", e.get("ai_summary") or e.get("type"))
        e.setdefault("ai_confidence", e.get("ai_confidence", 0.5))
    if redact:
        for e in enriched:
            if "payload" in e and e["payload"]:
                e["payload"] = "<REDACTED_PAYLOAD>"
    return enriched

