from ai_engine.core import register_plugin
from typing import List, Dict, Any, Optional
import importlib

_reports_annotate = None
try:
    mod = importlib.import_module("reports.ai_engine")
    _reports_annotate = getattr(mod, "annotate_reports", None)
except Exception:
    _reports_annotate = None

def _fallback_reports_annotate(items, use_llm=False):
    out = []
    for r in items:
        r2 = dict(r)
        r2.setdefault("ai_summary", r2.get("summary") or r2.get("title") or "Report")
        r2.setdefault("ai_confidence", 0.5)
        out.append(r2)
    return out

@register_plugin("reports")
def reports_plugin(items: List[Dict[str, Any]], use_llm: bool=False, redact: bool=True, tenant: Optional[str]=None) -> List[Dict[str, Any]]:
    annotator = _reports_annotate or _fallback_reports_annotate
    enriched = annotator(items, use_llm=use_llm) if callable(annotator) else _fallback_reports_annotate(items, use_llm=use_llm)
    for e in enriched:
        e.setdefault("ai_summary", e.get("ai_summary") or e.get("type"))
        e.setdefault("ai_confidence", e.get("ai_confidence", 0.5))
    if redact:
        for e in enriched:
            if "payload" in e and e["payload"]:
                e["payload"] = "<REDACTED_PAYLOAD>"
    return enriched
