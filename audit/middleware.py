import uuid

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
