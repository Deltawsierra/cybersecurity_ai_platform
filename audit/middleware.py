import logging
import uuid

import time
import requests
from django.http import JsonResponse
from django.conf import settings

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
            "ip_address": self._get_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            "method": request.method,
            "path": request.path,
        }
        return self.get_response(request)

    def _get_ip(self, request):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


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
        self._consecutive_failures = 0

        if not self.operator_key:
            logger.error(
                "CYBERENGINE_OPERATOR_KEY is not set: the defender middleware "
                "will allow every request without asking the engine."
            )

    def __call__(self, request):
        meta = getattr(request, "audit_metadata", {})

        ctx = {
            "ip": meta.get("ip_address"),
            "path": meta.get("path"),
            "method": meta.get("method"),
            "user_agent": meta.get("user_agent"),
            "query": request.META.get("QUERY_STRING", ""),
            "body": self._get_body(request),
        }

        decision = self._ask_engine(ctx)

        if not decision:
            return self.get_response(request)

        action = decision.get("action", "allow")

        if action == "block" and not self.monitor_only:
            return JsonResponse(
                {
                    "detail": "Request blocked by AI Defender",
                    "reason": decision.get("reason"),
                },
                status=403,
            )

        if action == "throttle" and not self.monitor_only:
            time.sleep(0.5)

        return self.get_response(request)

    def _ask_engine(self, ctx):
        """
        Ask the engine for a decision.

        Returning None means "no decision", and the caller then allows the
        request. That is the right default for a gateway, but it used to happen
        in complete silence: a wrong header, an expired key or an engine that
        was simply down turned this defensive layer off and nothing said so.
        Every failure is now logged, and repeated failures are logged as errors.
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
            if self._consecutive_failures:
                logger.info("Defender engine is answering again")
            self._consecutive_failures = 0
            try:
                return response.json()
            except ValueError:
                self._record_failure("engine returned a body that is not JSON")
                return None

        if response.status_code in (401, 403):
            self._record_failure(
                "engine refused the operator key (check CYBERENGINE_OPERATOR_KEY)"
            )
        else:
            self._record_failure(f"engine returned HTTP {response.status_code}")
        return None

    def _record_failure(self, reason):
        self._consecutive_failures += 1
        # The first failure is a warning; a run of them means the defensive
        # layer has been off for a while and deserves attention.
        if self._consecutive_failures >= self.failure_alert_threshold:
            logger.error(
                "Defender engine unavailable for %s consecutive requests: %s. "
                "Requests are being allowed without a decision.",
                self._consecutive_failures,
                reason,
            )
        else:
            logger.warning("Defender engine gave no decision: %s", reason)

    def _get_body(self, request):
        try:
            if request.body:
                return request.body.decode("utf-8", errors="ignore")
        except Exception:
            pass
        return ""
