from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
# A liveness probe runs far more often than 30 times a minute. The default
# anonymous throttle answered 429 to a load balancer polling every second,
# which reads as an outage.
@throttle_classes([])
def health(request):
    """
    Simple health check endpoint for the Athena desktop client.

    Returns:
    {
        "status": "ok" | "error",
        "message": "<short text>"
    }
    """
    return Response({"status": "ok", "message": "Django backend is alive."})
