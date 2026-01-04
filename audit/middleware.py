import uuid

import time
import requests
from django.http import JsonResponse
from django.conf import settings

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
        try:
            response = requests.post(
                f"{self.engine_url}/defend/",
                json=ctx,
                headers={
                    "X-OPERATOR-KEY": self.operator_key,
                    "Content-Type": "application/json",
                },
                timeout=0.5,
            )
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
        return None

    def _get_body(self, request):
        try:
            if request.body:
                return request.body.decode("utf-8", errors="ignore")
        except Exception:
            pass
        return ""
