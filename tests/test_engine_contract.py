import os
import requests
import pytest

ENGINE_URL = os.environ.get("CYBERENGINE_URL")
ENGINE_KEY = os.environ.get("CYBERENGINE_OPERATOR_KEY")

if not ENGINE_URL:
    raise RuntimeError("CYBERENGINE_URL must be set for contract tests")

if not ENGINE_KEY:
    raise RuntimeError("CYBERENGINE_OPERATOR_KEY must be set for contract tests")

HEADERS = {
    "X-API-Key": ENGINE_KEY,
    "Content-Type": "application/json",
}


def test_engine_health_endpoint():
    """
    Engine must expose /health and return a minimal status payload.
    """
    resp = requests.get(f"{ENGINE_URL}/health", timeout=5)

    assert resp.status_code == 200

    data = resp.json()
    assert isinstance(data, dict)
    assert data.get("status") == "ok"


def test_defender_log_text_contract():
    """
    Defender log analysis must:
    - accept { text: str }
    - return { alerts: list }
    """
    payload = {"text": "test log line"}

    resp = requests.post(
        f"{ENGINE_URL}/api/defend-log/text",
        json=payload,
        headers=HEADERS,
        timeout=10,
    )

    assert resp.status_code == 200

    data = resp.json()
    assert isinstance(data, dict)
    assert "alerts" in data
    assert isinstance(data["alerts"], list)


def test_cve_classify_contract():
    """
    CVE classification must:
    - accept { text: str }
    - return a JSON object
    The structure may evolve, so we only assert stability.
    """
    payload = {"text": "CVE-2024-9999 remote code execution via deserialization"}

    resp = requests.post(
        f"{ENGINE_URL}/api/classify-cve",
        json=payload,
        headers=HEADERS,
        timeout=10,
    )

    assert resp.status_code == 200

    data = resp.json()
    assert isinstance(data, dict)
    assert len(data) > 0  # engine must return *something*
