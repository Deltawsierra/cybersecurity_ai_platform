"""
The defender middleware is a gateway: it asks the engine for a decision on
every request and allows the request when it gets none. That default is
correct, but it used to be silent, so a wrong header or a stopped engine
switched the defensive layer off with nothing in the logs.

These tests need no engine: the HTTP call is replaced.
"""

import logging
from unittest import mock

import django
import pytest
import requests
from django.conf import settings
from django.http import HttpResponse

if not settings.configured:
    settings.configure(
        DEBUG=True,
        SECRET_KEY="test-secret-key-for-middleware-tests",
        ALLOWED_HOSTS=["*"],
        DATABASES={},
        INSTALLED_APPS=[],
        CYBERENGINE_URL="http://127.0.0.1:8001",
        CYBERENGINE_OPERATOR_KEY="test-operator-key",
        DEFENDER_MONITOR_ONLY=True,
    )
    django.setup()

from audit.middleware import DefenderMiddleware  # noqa: E402


class FakeRequest:
    def __init__(self):
        self.audit_metadata = {
            "ip_address": "1.2.3.4",
            "path": "/api/thing",
            "method": "GET",
            "user_agent": "pytest",
        }
        self.META = {"QUERY_STRING": ""}
        self.body = b""


def make_middleware(**overrides):
    for key, value in overrides.items():
        setattr(settings, key, value)
    return DefenderMiddleware(lambda request: HttpResponse("ok"))


def response(status=200, payload=None):
    fake = mock.Mock()
    fake.status_code = status
    fake.json.return_value = payload if payload is not None else {"action": "allow"}
    return fake


def test_the_engine_is_asked_on_the_standard_header():
    """
    The engine authenticates every privileged route on X-API-Key. This
    middleware sent X-Operator-Key, so once the engine moved to the standard
    dependency every call here would have failed.
    """
    middleware = make_middleware()
    with mock.patch("audit.middleware.requests.post", return_value=response()) as post:
        middleware(FakeRequest())

    _args, kwargs = post.call_args
    assert kwargs["headers"]["X-API-Key"] == "test-operator-key"
    assert "X-OPERATOR-KEY" not in kwargs["headers"]


def test_a_refused_key_is_logged_rather_than_passing_in_silence(caplog):
    middleware = make_middleware()
    with caplog.at_level(logging.WARNING, logger="audit.middleware"):
        with mock.patch("audit.middleware.requests.post", return_value=response(status=403)):
            result = middleware(FakeRequest())

    assert result.status_code == 200, "the request is still allowed"
    assert any("refused the operator key" in r.getMessage() for r in caplog.records)


def test_an_unreachable_engine_is_logged(caplog):
    middleware = make_middleware()
    with caplog.at_level(logging.WARNING, logger="audit.middleware"):
        with mock.patch(
            "audit.middleware.requests.post", side_effect=requests.ConnectionError("refused")
        ):
            result = middleware(FakeRequest())

    assert result.status_code == 200
    assert any("unreachable" in r.getMessage() for r in caplog.records)


def test_a_run_of_failures_escalates_to_an_error(caplog):
    middleware = make_middleware(DEFENDER_FAILURE_ALERT_AFTER=3)
    with caplog.at_level(logging.WARNING, logger="audit.middleware"):
        with mock.patch(
            "audit.middleware.requests.post", side_effect=requests.ConnectionError("refused")
        ):
            for _ in range(4):
                middleware(FakeRequest())

    assert any(r.levelno == logging.ERROR for r in caplog.records), (
        "a defensive layer that has been off for several requests should escalate"
    )


def test_a_block_decision_is_enforced_when_not_monitoring_only():
    middleware = make_middleware(DEFENDER_MONITOR_ONLY=False)
    with mock.patch(
        "audit.middleware.requests.post",
        return_value=response(payload={"action": "block", "reason": "sqli"}),
    ):
        result = middleware(FakeRequest())

    assert result.status_code == 403


def test_a_block_decision_is_only_observed_in_monitor_mode():
    middleware = make_middleware(DEFENDER_MONITOR_ONLY=True)
    with mock.patch(
        "audit.middleware.requests.post",
        return_value=response(payload={"action": "block", "reason": "sqli"}),
    ):
        result = middleware(FakeRequest())

    assert result.status_code == 200
