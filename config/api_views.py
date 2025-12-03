from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
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
