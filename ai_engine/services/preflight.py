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

from django.conf import settings

from ai_engine.services.cyberengine_client import CyberEngineClient, EngineError

log = logging.getLogger(__name__)

DECLARATION = Path(settings.BASE_DIR) / "deployment" / "approved_deployment.yaml"

# Short on purpose. See the module docstring.
CACHE_SECONDS = 60

_ENFORCE_WORDS = frozenset({
    "1", "true", "yes", "on", "y", "enforce", "enforced", "enforcing",
    "require", "required", "strict", "block", "blocking", "hard",
})
_OBSERVE_WORDS = frozenset({
    "0", "false", "no", "off", "n", "observe", "observing", "permissive",
    "monitor", "report", "warn", "advisory", "disabled", "soft", "",
})

# A hostile or broken engine must not be able to write an unbounded blob to
# the scan row or echo one back in a response body.
MAX_TEXT = 2000

_cache: Dict[str, Any] = {}
_lock = threading.Lock()


# Every spelling of "no". audit/middleware.py already learned this lesson and
# says so in a comment: reading only the exact token "block" meant "deny" was
# read as permission. This module re-introduced it one directory away --
# `verdict == "blocked"`, case-sensitive, untrimmed -- so "BLOCKED", " blocked",
# "denied", "refused" and the extension gate's own "revoked" all fell through
# to the advisory branch and the scan ran under enforce.
_BLOCKING_VERDICTS = frozenset({
    "blocked", "block", "deny", "denied", "refuse", "refused",
    "reject", "rejected", "revoked", "fail", "failed",
})

# "There is no approval on record" is its own answer: the gate has nothing to
# measure against, which is not the same as measuring and finding nothing.
_UNAPPROVED_VERDICTS = frozenset({
    "unapproved", "no_approval", "not_approved", "unmeasured",
})

# The only answers that mean "carry on". Anything outside all three sets is
# not understood, and not understood is not a yes.
_CLEAN_VERDICTS = frozenset({"unchanged", "ok", "clean", "pass", "passed"})
_REVIEW_VERDICTS = frozenset({"review", "advisory", "warn", "warning"})


def _normalise(verdict: Optional[str]) -> Optional[str]:
    if verdict is None:
        return None
    return str(verdict).strip().lower()


class DeploymentNotApproved(Exception):
    """The engine is not the deployment that was approved."""

    def __init__(self, message: str, report: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.report = report or {}


def _loader():
    """A YAML loader that refuses the two shapes a reviewer cannot see.

    Duplicate keys: yaml.safe_load takes the last one silently, so a second
    `components:` block appended to the bottom of the file wins while a
    reviewer reading top-down sees the first. The diff shows an addition
    rather than a modification. This file's own header says the change is
    reviewed like any other, which makes the reviewer the control -- so a
    shape that defeats the reviewer defeats the control.

    Aliases: PyYAML shares object references, so a nested-alias file parses
    cheaply and then expands when it is re-serialised as JSON for the engine,
    where there are no aliases. 360 bytes became a 66MB outbound POST built
    in the worker's memory.
    """
    import yaml

    class StrictLoader(yaml.SafeLoader):
        pass

    def no_duplicates(loader, node, deep=False):
        mapping = {}
        for key_node, value_node in node.value:
            key = loader.construct_object(key_node, deep=deep)
            if key in mapping:
                raise yaml.YAMLError(
                    f"{key!r} is declared twice. The later one would silently "
                    f"win, so a reviewer reading this file top-down would be "
                    f"reading something other than what runs."
                )
            mapping[key] = loader.construct_object(value_node, deep=deep)
        return mapping

    def no_aliases(loader, node):
        raise yaml.YAMLError(
            "YAML aliases are not accepted here: they cost nothing to parse "
            "and expand when this is serialised for the engine."
        )

    StrictLoader.add_constructor(
        yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, no_duplicates
    )
    StrictLoader.add_constructor("tag:yaml.org,2002:alias", no_aliases)
    StrictLoader.compose_node = _refuse_aliases(StrictLoader.compose_node)
    return StrictLoader


def _refuse_aliases(compose_node):
    def wrapped(self, parent, index):
        if self.check_event(__import__("yaml").events.AliasEvent):
            raise __import__("yaml").YAMLError(
                "YAML aliases are not accepted in the deployment declaration."
            )
        return compose_node(self, parent, index)

    return wrapped


def declaration() -> Dict[str, Any]:
    """The approved deployment, as declared in the repository.

    yaml is imported inside this function rather than at module scope. This
    module is imported by pentest.views, which is imported by pentest.urls,
    which is imported by the root URL conf -- so a missing dependency in a
    governance check took down every route in the application rather than the
    check. A gate that cannot answer should refuse scans, not the login page.

    Everything here raises DeploymentNotApproved rather than propagating the
    underlying error. A file that is a list, a directory, or unreadable used
    to reach the view as AttributeError or IsADirectoryError and answer 500;
    an unquoted `deployment_id: 2024-01-01` parsed to a date, passed the
    truthiness check, and then killed PentestScan.objects.create because a
    date is not JSON serialisable -- after the gate had already said yes.
    """
    try:
        import yaml
    except ImportError as exc:  # pragma: no cover - a packaging error, not a path
        raise DeploymentNotApproved(
            f"PyYAML is not installed, so {DECLARATION.name} cannot be read and "
            f"nothing can say what this deployment is approved to be: {exc}"
        ) from exc

    if not DECLARATION.exists():
        raise DeploymentNotApproved(
            f"{DECLARATION} does not exist, so there is nothing that says what "
            f"this deployment is approved to be"
        )

    try:
        text = DECLARATION.read_text()
    except OSError as exc:
        raise DeploymentNotApproved(
            f"{DECLARATION.name} could not be read: {exc.strerror or exc}"
        ) from exc

    try:
        loaded = yaml.load(text, Loader=_loader()) or {}
    except yaml.YAMLError as exc:
        raise DeploymentNotApproved(
            f"{DECLARATION.name} is not YAML this will accept: {exc}"
        ) from exc

    if not isinstance(loaded, dict):
        raise DeploymentNotApproved(
            f"{DECLARATION.name} is a {type(loaded).__name__}, not an object "
            f"naming a deployment_id and its components"
        )

    deployment_id = loaded.get("deployment_id")
    components = loaded.get("components")

    # Typed, not merely truthy. A date is truthy and is not a deployment id,
    # and it fails much later, on a line that has nothing to do with YAML.
    if not isinstance(deployment_id, str) or not deployment_id.strip():
        raise DeploymentNotApproved(
            f"{DECLARATION.name} must name a deployment_id as text; found "
            f"{type(deployment_id).__name__}"
        )
    if not isinstance(components, dict) or not components:
        raise DeploymentNotApproved(
            f"{DECLARATION.name} must declare its components as an object; found "
            f"{type(components).__name__}"
        )

    return {"deployment_id": deployment_id.strip(), "components": components}


def mode() -> str:
    """enforce or observe.

    Defaults to observe, matching the engine's own extension gate: a gate
    that blocks on the day it is switched on, in a deployment nobody has
    approved yet, is one somebody turns off. Turning it to enforce is the
    deliberate act -- and until then a blocked verdict is still logged, so
    the record shows what would have been refused.
    """
    raw = getattr(settings, "CYBERENGINE_ASSURANCE_MODE", "observe")
    value = str(raw).strip().lower()

    if value in _ENFORCE_WORDS:
        return "enforce"
    if value in _OBSERVE_WORDS:
        return "observe"

    # Neither. Observe, because refusing every scan on a typo is its own
    # outage -- but never in silence. "enforcing" and "permissive" are
    # SELinux's vocabulary and the likeliest thing an ops engineer types, and
    # `enforcing` reading as a disabled gate is exactly what the setting's own
    # comment warns about: a gate that is off while the record says it was on.
    log.error(
        "[ASSURANCE] CYBERENGINE_ASSURANCE_MODE=%r is not a value this "
        "understands, so the gate is in observe and is NOT refusing scans. "
        "Say one of: %s",
        raw, ", ".join(sorted(_ENFORCE_WORDS)),
    )
    return "observe"


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
                # The mode is re-read rather than taken from the cached
                # report. An operator who switches to enforce during an
                # incident was otherwise served up to sixty more seconds of
                # scans against a deployment already known to be blocked, and
                # the log line still told them to set the variable they had
                # just set.
                report = dict(cached["report"], mode=mode())
                _raise_if_enforcing(report)
                return report

    # A declaration that cannot be read is a report, not an exception thrown
    # past the mode check. It used to raise straight out of check(), so a
    # missing or malformed file refused every scan even in observe -- which
    # the docstring and mode() both promise never blocks. deployment/ is a new
    # directory holding one file, and any build that COPYs specific app dirs,
    # packages a wheel, or mounts the repo read-only loses it.
    try:
        client = client or CyberEngineClient.from_settings()
        declared = declaration()
    except DeploymentNotApproved as refusal:
        report = {
            "deployment_id": None,
            "mode": mode(),
            "checked_at": time.time(),
            "verdict": "unknown",
            "detail": str(refusal),
        }
        _store(key, report, now)
        _raise_if_enforcing(report)
        return report
    except RuntimeError as exc:
        # from_settings() raises this when the engine is not configured.
        report = {
            "deployment_id": None,
            "mode": mode(),
            "checked_at": time.time(),
            "verdict": "unknown",
            "detail": f"the engine is not configured: {exc}",
        }
        _store(key, report, now)
        _raise_if_enforcing(report)
        return report

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
    except Exception as exc:  # noqa: BLE001 - see below
        # Not just EngineError. _get/_post call resp.json() outside their own
        # try, so a 200 carrying an HTML error page from a reverse proxy
        # raises JSONDecodeError through this and out of the view as a 500 --
        # on the path that runs before a scan row even exists. _verdict's
        # docstring already says a malformed reply must not crash the scan
        # path; it guarded valid-JSON-wrong-shape and missed not-JSON-at-all.
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
    report["detail"] = _jsonable(report["detail"])
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
    if isinstance(value, str):
        # Capped. Containers were bounded and strings were not, so a hostile
        # engine could write megabytes to the scan row on every scan and have
        # them echoed back in the refusal body.
        return value if len(value) <= MAX_TEXT else value[:MAX_TEXT] + "… (truncated)"
    if value is None or isinstance(value, (bool, int, float)):
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
    assurance_verdict = _normalise(_verdict(report.get("assurance")))
    extension_verdict = _normalise(_verdict(report.get("extensions"), nested="review"))

    raw_unattributed = report.get("unattributed")
    if isinstance(raw_unattributed, dict) and isinstance(
        raw_unattributed.get("effects"), list
    ):
        unattributed = raw_unattributed["effects"]
    else:
        unattributed = []

    if assurance_verdict is None or extension_verdict is None:
        return "unknown", (
            "the engine did not answer in a shape this understands, so nothing "
            "was established about whether it is the approved deployment"
        )

    if assurance_verdict in _BLOCKING_VERDICTS:
        return "blocked", f"assurance gate: {_detail(report.get('assurance'))}"
    if extension_verdict in _BLOCKING_VERDICTS:
        return "blocked", (
            f"extension gate: {_detail(report.get('extensions'), nested='review')}"
        )
    if assurance_verdict in _UNAPPROVED_VERDICTS:
        return "blocked", (
            "this engine has no approval on record, so there is nothing for the "
            "gate to measure against: run `manage.py approve_deployment`"
        )

    # A verdict in none of the sets is a verdict this does not understand, and
    # not understood is not a yes. The engine's gate is a separate codebase:
    # one release that renames a verdict must not silently disable this one.
    unknown = [
        name
        for name, verdict in (
            ("assurance", assurance_verdict),
            ("extension", extension_verdict),
        )
        if verdict not in _CLEAN_VERDICTS | _REVIEW_VERDICTS
    ]
    if unknown:
        return "unknown", (
            f"the {' and '.join(unknown)} gate answered with a verdict this "
            f"does not recognise, so nothing was established"
        )

    reasons = []
    if assurance_verdict in _REVIEW_VERDICTS:
        reasons.append(f"assurance gate: {_detail(report.get('assurance'))}")
    if extension_verdict in _REVIEW_VERDICTS:
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
