"""
Ask the engine's own gates before pointing it at a customer.

Six subsystems were built into the engine and none of them was on this
code path. A grep of this repository for "assurance", "/api/extensions",
"/api/authority" and "/api/evidence" returned nothing: the change gate was
consulted only by its own HTTP route and its own tests, so a deployment
whose model, tools, routes, policies, hooks and permissions had all changed
since approval ran every scan with nothing objecting.

Three questions are asked here, in the order they matter:

  Is the engine still the deployment that was approved? Both the declared
  half, from deployment/approved_deployment.yaml, and the measured half,
  which the engine takes from its own process and which nothing here can
  state.

  Is every loaded extension the one that was approved? A revoked scanner
  still running is a blocking answer in every mode.

  Did anything reach the network with no authority in force? Not blocking --
  it is a fact about the past, not about this scan -- but it belongs in the
  record next to the scan it preceded.

The result is cached briefly. Not for speed: the engine's own boot review
is measured once per process and a six-hour-old answer was one of the
audit's findings, so the cache is short enough that an operator revoking a
scanner sees it take effect within a minute rather than at the next restart.
"""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional

import yaml
from django.conf import settings

from ai_engine.services.cyberengine_client import CyberEngineClient, EngineError

log = logging.getLogger(__name__)

DECLARATION = Path(settings.BASE_DIR) / "deployment" / "approved_deployment.yaml"

# Short on purpose. See the module docstring.
CACHE_SECONDS = 60

_cache: Dict[str, Any] = {}
_lock = threading.Lock()


class DeploymentNotApproved(Exception):
    """The engine is not the deployment that was approved."""

    def __init__(self, message: str, report: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.report = report or {}


def declaration() -> Dict[str, Any]:
    """The approved deployment, as declared in the repository.

    Read from disk each time rather than cached at import: a deployment that
    edits this file and restarts one worker should not have two workers
    disagreeing about what was approved.
    """
    if not DECLARATION.exists():
        raise DeploymentNotApproved(
            f"{DECLARATION} does not exist, so there is nothing that says what "
            f"this deployment is approved to be"
        )
    loaded = yaml.safe_load(DECLARATION.read_text()) or {}
    if not loaded.get("deployment_id") or not loaded.get("components"):
        raise DeploymentNotApproved(
            f"{DECLARATION} does not name a deployment_id and its components"
        )
    return loaded


def mode() -> str:
    """enforce or observe.

    Defaults to observe, matching the engine's own extension gate: a gate
    that blocks on the day it is switched on, in a deployment nobody has
    approved yet, is one somebody turns off. Turning it to enforce is the
    deliberate act -- and until then a blocked verdict is still logged, so
    the record shows what would have been refused.
    """
    value = str(getattr(settings, "CYBERENGINE_ASSURANCE_MODE", "observe")).strip().lower()
    return "enforce" if value in {"1", "true", "yes", "on", "enforce", "enforced",
                                  "require", "required", "strict", "block"} else "observe"


def check(client: Optional[CyberEngineClient] = None,
          tenant_id: Optional[str] = None,
          force: bool = False) -> Dict[str, Any]:
    """Ask the gates. Returns a report; raises only under enforce."""
    key = f"{tenant_id or 'default'}"
    now = time.monotonic()

    if not force:
        with _lock:
            cached = _cache.get(key)
            if cached and now - cached["at"] < CACHE_SECONDS:
                report = cached["report"]
                _raise_if_enforcing(report)
                return report

    client = client or CyberEngineClient.from_settings()
    declared = declaration()

    report: Dict[str, Any] = {
        "deployment_id": declared["deployment_id"],
        "mode": mode(),
        "checked_at": time.time(),
    }

    try:
        report["assurance"] = client.assurance_check(
            declared["deployment_id"], declared["components"], tenant_id=tenant_id
        )
        report["extensions"] = client.extension_review()
        report["unattributed"] = client.unattributed_effects(limit=25)
    except EngineError as exc:
        # An engine that cannot answer is not an engine that answered yes.
        # Under observe this is logged and the scan proceeds, because the
        # gate is not yet the thing standing between a customer and their
        # test; under enforce it is a refusal.
        report["error"] = str(exc)
        report["verdict"] = "unknown"
        report["detail"] = f"the engine could not be asked: {exc}"
        _store(key, report, now)
        _raise_if_enforcing(report)
        return report

    report["verdict"], report["detail"] = _decide(report)
    for section in ("assurance", "extensions", "unattributed"):
        report[section] = _jsonable(report.get(section))
    _store(key, report, now)
    _raise_if_enforcing(report)
    return report


def _jsonable(value: Any, depth: int = 0) -> Any:
    """A value that can be stored and read back.

    The engine's replies are external data and this report is persisted on
    the scan row, so what goes in has to be JSON, not whatever the client
    handed back. Anything that is not is kept as its repr rather than
    dropped: a field that could not be stored is still a fact about the
    answer, and silently omitting it would make a malformed reply look like
    a well-formed one.
    """
    if depth > 6:
        return "..."
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, dict):
        return {str(k): _jsonable(v, depth + 1) for k, v in list(value.items())[:100]}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v, depth + 1) for v in list(value)[:100]]
    return repr(value)[:500]


def _verdict(answer: Any, nested: Optional[str] = None) -> Optional[str]:
    """The verdict in an answer, or None if the answer is not one.

    The engine's replies are external data. An answer that is not the shape
    this expects is not an answer that said yes: it reads as no verdict,
    which _decide turns into "unknown" rather than into a pass. A malformed
    reply must not crash the scan path either -- the caller would see a 500
    where the honest report is "the engine could not be understood".
    """
    if not isinstance(answer, dict):
        return None
    if nested and isinstance(answer.get(nested), dict):
        answer = answer[nested]
    verdict = answer.get("verdict")
    return verdict if isinstance(verdict, str) else None


def _detail(answer: Any, nested: Optional[str] = None) -> str:
    if not isinstance(answer, dict):
        return "the engine's answer was not a report"
    if nested and isinstance(answer.get(nested), dict):
        answer = answer[nested]
    detail = answer.get("detail")
    return detail if isinstance(detail, str) else "no detail given"


def _decide(report: Dict[str, Any]):
    assurance_verdict = _verdict(report.get("assurance"))
    extension_verdict = _verdict(report.get("extensions"), nested="review")

    raw_unattributed = report.get("unattributed")
    if isinstance(raw_unattributed, dict) and isinstance(raw_unattributed.get("effects"), list):
        unattributed = raw_unattributed["effects"]
    else:
        unattributed = []

    if assurance_verdict is None or extension_verdict is None:
        return "unknown", (
            "the engine did not answer in a shape this understands, so nothing "
            "was established about whether it is the approved deployment"
        )

    if assurance_verdict == "blocked":
        return "blocked", f"assurance gate: {_detail(report.get('assurance'))}"
    if extension_verdict == "blocked":
        return "blocked", (
            f"extension gate: {_detail(report.get('extensions'), nested='review')}"
        )
    if assurance_verdict == "unapproved":
        return "blocked", (
            "this engine has no approval on record, so there is nothing for the "
            "gate to measure against: run `manage.py approve_deployment`"
        )

    reasons = []
    if assurance_verdict != "unchanged":
        reasons.append(f"assurance gate: {_detail(report.get('assurance'))}")
    if extension_verdict != "ok":
        reasons.append(
            f"extension gate: {_detail(report.get('extensions'), nested='review')}"
        )
    if unattributed:
        # Not blocking: it is a fact about the past, not about this scan.
        reasons.append(
            f"{len(unattributed)} effect(s) reached the network with no authority "
            f"in force"
        )

    if reasons:
        return "review", "; ".join(reasons)
    return "ok", "the engine is the deployment that was approved"


def _store(key: str, report: Dict[str, Any], at: float) -> None:
    with _lock:
        _cache[key] = {"at": at, "report": report}


def _raise_if_enforcing(report: Dict[str, Any]) -> None:
    verdict = report.get("verdict")
    if verdict in ("blocked", "unknown") and report.get("mode") == "enforce":
        raise DeploymentNotApproved(report.get("detail") or verdict, report)
    if verdict in ("blocked", "unknown"):
        log.warning(
            "[ASSURANCE] %s: %s (mode=observe, so the scan proceeds; set "
            "CYBERENGINE_ASSURANCE_MODE=enforce to refuse)",
            verdict, report.get("detail"),
        )
    elif verdict == "review":
        log.info("[ASSURANCE] review: %s", report.get("detail"))


def clear_cache() -> None:
    """For tests, and for a worker that has just been told to re-check."""
    with _lock:
        _cache.clear()
