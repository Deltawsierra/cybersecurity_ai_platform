import logging
import re
import time
import uuid

import requests
from django.conf import settings
from django.core.exceptions import RequestDataTooBig
from django.http import JsonResponse, UnreadablePostError

logger = logging.getLogger(__name__)


class RequestMetadataMiddleware:
    """
    Attaches request metadata for audit logging.
    Does NOT write audit logs itself.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.audit_metadata = {
            "request_id": str(uuid.uuid4()),
            "ip_address": client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            "method": request.method,
            "path": request.path,
        }
        return self.get_response(request)


def client_ip(request):
    """
    The caller's address, trusting X-Forwarded-For only behind a known proxy.

    The first value in that header used to be taken unconditionally. Any client
    can set it, and this address is the only key the engine's rate limiter and
    block table use, so a caller could rotate the header to evade rate limiting
    entirely, or forge one request to get somebody else's address blocked.

    Set DEFENDER_TRUSTED_PROXY_COUNT to the number of proxies that append to
    the header in front of this service. Zero, the default, means the header is
    not trusted at all.
    """
    remote = request.META.get("REMOTE_ADDR")
    depth = int(getattr(settings, "DEFENDER_TRUSTED_PROXY_COUNT", 0) or 0)
    if depth <= 0:
        return remote

    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
    if not hops:
        return remote

    # Count from the right: the rightmost entries were added by our own
    # proxies and are the only ones a client cannot control.
    index = len(hops) - depth
    return hops[index] if 0 <= index < len(hops) else remote


# Request bodies are forwarded to the engine for inspection. These never are:
# the engine learns nothing from a credential that it could not learn from the
# path, and forwarding them puts passwords and refresh tokens into another
# service's logs.
SENSITIVE_PATHS = ("/api/token", "/admin/login", "/api/accounts/users")

# Only these content types are worth inspecting. A multipart upload is skipped:
# forwarding it would copy the whole file into another service.
INSPECTABLE_TYPES = ("application/json", "application/x-www-form-urlencoded", "text/plain")

# Paths that never carry an attack worth a synchronous round trip.
SKIP_PREFIXES = ("/static/", "/media/", "/admin/jsi18n/", "/api/health")

# Values under keys like these are replaced before the body is forwarded.
_SENSITIVE_VALUE = re.compile(
    r'("(?:[^"]*(?:pass|pwd|secret|token|authorization|api[_-]?key|credential|session)[^"]*)"\s*:\s*)"[^"]*"',
    re.I,
)


class DefenderMiddleware:
    """
    Thin enforcement layer.
    NO AI logic lives here.
    Calls the Cybersecurity AI Engine and enforces its decision.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.engine_url = settings.CYBERENGINE_URL.rstrip("/")
        self.operator_key = settings.CYBERENGINE_OPERATOR_KEY
        self.monitor_only = getattr(settings, "DEFENDER_MONITOR_ONLY", True)
        self.timeout = getattr(settings, "DEFENDER_TIMEOUT_SECONDS", 0.5)
        self.failure_alert_threshold = getattr(settings, "DEFENDER_FAILURE_ALERT_AFTER", 10)
        self.failure_window = getattr(settings, "DEFENDER_FAILURE_WINDOW_SECONDS", 60)
        self.max_body_bytes = getattr(settings, "DEFENDER_MAX_BODY_BYTES", 64 * 1024)

        # Failures within a window, not consecutive ones. A counter reset by
        # every success never escalates on a half-dead engine, which is the
        # common case: half the traffic can go uninspected without a word.
        self._recent_failures = []
        # None, not 0.0. time.monotonic() counts from an arbitrary point,
        # which on a freshly booted machine is near zero, so a 0.0 sentinel
        # read as "alerted a moment ago" and suppressed the first alert.
        self._last_alert = None
        self._last_outcome_failed = False

        if not self.operator_key:
            logger.error(
                "CYBERENGINE_OPERATOR_KEY is not set: the defender middleware "
                "will allow every request without asking the engine."
            )

    def __call__(self, request):
        if request.path.startswith(SKIP_PREFIXES):
            return self.get_response(request)

        meta = getattr(request, "audit_metadata", {})
        body, body_problem = self._get_body(request)

        ctx = {
            "ip": meta.get("ip_address") or client_ip(request),
            "path": meta.get("path") or request.path,
            "method": meta.get("method") or request.method,
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            "query": request.META.get("QUERY_STRING", ""),
            "body": body,
        }

        if body_problem:
            # A body we could not read is not an empty body. Saying so is the
            # difference between "nothing suspicious" and "not inspected".
            self._record_failure(body_problem)

        decision = self._ask_engine(ctx)
        if not decision:
            return self.get_response(request)

        action = str(decision.get("action", "allow")).strip().lower()

        # The engine sends an explicit boolean. Reading only the action string
        # meant any spelling it did not recognise, including "deny" or "BLOCK",
        # was treated as permission.
        refused = decision.get("allow") is False or action == "block"
        throttled = action == "throttle"

        if refused:
            if self.monitor_only:
                logger.warning(
                    "Defender would have blocked %s %s from %s (%s); monitor mode is on",
                    ctx["method"], ctx["path"], ctx["ip"], decision.get("reason"),
                )
                return self.get_response(request)
            return JsonResponse(
                {
                    "detail": "Request blocked by AI Defender",
                    "reason": decision.get("reason"),
                },
                status=403,
            )

        if throttled:
            if self.monitor_only:
                logger.info(
                    "Defender would have throttled %s %s from %s; monitor mode is on",
                    ctx["method"], ctx["path"], ctx["ip"],
                )
                return self.get_response(request)
            # Sleeping here spent a worker on the caller's behalf, which turns
            # a rate-limit signal into a self-inflicted denial of service.
            response = JsonResponse({"detail": "Rate limited"}, status=429)
            response["Retry-After"] = str(int(decision.get("block_seconds") or 1))
            return response

        if action not in ("allow", ""):
            logger.warning("Defender returned an unrecognised action %r; allowing", action)

        return self.get_response(request)

    def _ask_engine(self, ctx):
        """
        Ask the engine for a decision.

        Returning None means "no decision", and the caller then allows the
        request. That is the right default for a gateway, but it used to happen
        in complete silence: a wrong header, an expired key or an engine that
        was simply down turned this defensive layer off and nothing said so.
        """
        try:
            response = requests.post(
                f"{self.engine_url}/defend",
                json=ctx,
                headers={
                    # The engine authenticates every privileged route on
                    # X-API-Key. It still accepts the old X-Operator-Key for
                    # now, but that spelling is deprecated.
                    "X-API-Key": self.operator_key,
                    "Content-Type": "application/json",
                },
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            self._record_failure(f"engine unreachable: {exc.__class__.__name__}")
            return None

        if response.status_code == 200:
            try:
                decision = response.json()
            except ValueError:
                self._record_failure("engine returned a body that is not JSON")
                return None

            # Valid JSON of the wrong shape used to reach decision.get() and
            # raise, turning a bad engine response into a 500 on every request.
            if not isinstance(decision, dict):
                self._record_failure("engine returned a decision that is not an object")
                return None

            self._note_success()
            return decision

        if response.status_code in (401, 403):
            self._record_failure(
                "engine refused the operator key (check CYBERENGINE_OPERATOR_KEY)"
            )
        else:
            self._record_failure(f"engine returned HTTP {response.status_code}")
        return None

    def _get_body(self, request):
        """
        The part of the body worth inspecting, and why it was skipped.

        Returns (body, problem). A problem is a reason the request could not be
        inspected, and is recorded as a failure. Reading the body used to sit
        inside a bare except, so a request larger than
        DATA_UPLOAD_MAX_MEMORY_SIZE raised, was swallowed, and reached the
        engine as an empty body: padding a payload past that limit walked past
        inspection with nothing logged.
        """
        if request.path.startswith(SENSITIVE_PATHS):
            return "", None

        content_type = (request.META.get("CONTENT_TYPE") or "").split(";")[0].strip().lower()
        if content_type and content_type not in INSPECTABLE_TYPES:
            # A file upload is not forwarded. It would copy the whole file into
            # another service and triple the memory cost of the request.
            return "", None

        try:
            raw = request.body
        except (RequestDataTooBig, UnreadablePostError) as exc:
            return "", f"request body could not be inspected: {exc.__class__.__name__}"
        except Exception as exc:  # pragma: no cover - defensive
            return "", f"request body could not be read: {exc.__class__.__name__}"

        if not raw:
            return "", None

        text = raw[: self.max_body_bytes].decode("utf-8", errors="ignore")
        return _SENSITIVE_VALUE.sub(r'\1"[redacted]"', text), None

    def _note_success(self):
        # The window is deliberately not cleared here. Clearing it on every
        # success is what made a half-dead engine invisible: alternating
        # failure and success never reached the threshold, so half the traffic
        # could go uninspected without one line in the log.
        if self._last_outcome_failed:
            self._last_outcome_failed = False
            logger.info("Defender engine is answering again")

    def _record_failure(self, reason):
        now = time.monotonic()
        self._last_outcome_failed = True
        self._recent_failures = [
            at for at in self._recent_failures if now - at < self.failure_window
        ]
        self._recent_failures.append(now)

        if len(self._recent_failures) < self.failure_alert_threshold:
            logger.warning("Defender engine gave no decision: %s", reason)
            return

        # Escalate, but not once per request: a real outage would otherwise
        # fill the log at request rate.
        if self._last_alert is None or now - self._last_alert >= self.failure_window:
            self._last_alert = now
            logger.error(
                "Defender engine unavailable for %s of the last %ss: %s. "
                "Requests are being allowed without a decision.",
                len(self._recent_failures),
                self.failure_window,
                reason,
            )
