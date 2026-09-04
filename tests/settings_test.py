"""
Settings for the test suite.

Reuses the real settings so the tests exercise the real permission classes,
serializers and querysets, and overrides only what a test run must not touch:
the database, the mail backend, and the outbound engine.
"""

import os

os.environ.setdefault("DJANGO_DEBUG", "1")
os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key-not-used-outside-tests")

from config.settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# RequestFactory sends Host: testserver.
ALLOWED_HOSTS = ["*"]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CYBERENGINE_URL = "http://127.0.0.1:8001"
CYBERENGINE_OPERATOR_KEY = "test-operator-key"

# The defender middleware makes an outbound call per request; the tests here
# drive views directly, but leave it in monitor mode regardless.
DEFENDER_MONITOR_ONLY = True

# Throttling would make the ordering of tests significant.
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"anon": None, "user": None}}
