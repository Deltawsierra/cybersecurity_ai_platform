from ai_engine.core import register_plugin
from typing import List, Dict, Any, Optional
import importlib

_detection_annotate = None
try:
    mod = importlib.import_module("detection.ai_engine")
    _detection_annotate = getattr(mod, "annotate_detections", None)
except Exception:
    _detection_annotate = None

def _fallback_detection_annotate(items, use_llm=False):
    out = []
    for i in items:
        i2 = dict(i)
        i2.setdefault("ai_summary", i2.get("evidence") or i2.get("type") or "Detection")
        i2.setdefault("suggested_remediation", i2.get("details", {}).get("remediation"))
        i2.setdefault("ai_confidence", 0.5)
        out.append(i2)
    return out

@register_plugin("detection_findings")
def detection_plugin(findings: List[Dict[str, Any]], use_llm: bool=False, redact: bool=True, tenant: Optional[str]=None) -> List[Dict[str, Any]]:
    annotator = _detection_annotate or _fallback_detection_annotate
    enriched = annotator(findings, use_llm=use_llm) if callable(annotator) else _fallback_detection_annotate(findings, use_llm=use_llm)
    for e in enriched:
        e.setdefault("ai_summary", e.get("ai_summary") or e.get("type"))
        e.setdefault("ai_confidence", e.get("ai_confidence", 0.5))
    if redact:
        for e in enriched:
            if "payload" in e and e["payload"]:
                e["payload"] = "<REDACTED_PAYLOAD>"
    return enriched
