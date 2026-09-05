import time

import requests
from django.conf import settings as django_settings
from django.conf import settings


# (connect, read). Overridable so a long scan can be given more room without
# editing source.
ENGINE_TIMEOUT = (
    float(getattr(django_settings, "CYBERENGINE_CONNECT_TIMEOUT", 3.05)),
    float(getattr(django_settings, "CYBERENGINE_READ_TIMEOUT", 60)),
)


# How long to keep collecting a scan the engine is running for us, and how
# often to ask. Polling does not hold a connection, so this can be far longer
# than any read timeout: a scan that takes four minutes is now four minutes of
# waiting rather than a scan the engine ran and we recorded nothing about.
SCAN_COLLECT_SECONDS = float(getattr(django_settings, "CYBERENGINE_SCAN_TIMEOUT", 600))
SCAN_POLL_SECONDS = float(getattr(django_settings, "CYBERENGINE_POLL_INTERVAL", 2.0))

# Handed to the engine so a short scan answers on the first request and needs
# no polling at all. Comfortably inside the read timeout.
SCAN_INLINE_WAIT_SECONDS = 20.0


class EngineError(Exception):
    pass


class ScanStillRunning(EngineError):
    """
    We stopped collecting before the engine finished.

    Carries the run id, because the scan is still going and its result can be
    collected later. Losing that id is how a scan becomes work the engine did
    for a customer that nobody has a record of.
    """

    def __init__(self, message: str, run_id: str):
        super().__init__(message)
        self.run_id = run_id


class CyberEngineClient:
    """
    Thin HTTP client for the external Cybersecurity AI Engine.
    Django contains NO AI logic.
    """

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json",
        }

    @classmethod
    def from_settings(cls):
        if not settings.CYBERENGINE_OPERATOR_KEY:
            raise RuntimeError("CYBERENGINE_OPERATOR_KEY is not configured")

        if not settings.CYBERENGINE_URL:
            raise RuntimeError("CYBERENGINE_URL is not configured")

        return cls(
            base_url=settings.CYBERENGINE_URL,
            api_key=settings.CYBERENGINE_OPERATOR_KEY,
        )

    def _get(self, path: str) -> dict:
        try:
            resp = requests.get(
                f"{self.base_url}{path}", headers=self.headers, timeout=ENGINE_TIMEOUT
            )
        except requests.RequestException as e:
            raise EngineError(f"Engine unreachable: {e}")

        if not (200 <= resp.status_code < 300):
            raise EngineError(f"Engine error {resp.status_code}: {resp.text}")

        return resp.json()

    def _post(self, path: str, payload: dict) -> dict:
        try:
            resp = requests.post(
                f"{self.base_url}{path}",
                json=payload,
                headers=self.headers,
                # A connect and read pair. This was a single value of 1000 seconds,
                # commented as preventing worker starvation, which is what it
                # caused: one hung engine call pinned a worker for 17 minutes.
                timeout=ENGINE_TIMEOUT,
            )
        except requests.RequestException as e:
            raise EngineError(f"Engine unreachable: {e}")

        if not (200 <= resp.status_code < 300):
            raise EngineError(
                f"Engine error {resp.status_code}: {resp.text}"
            )

        return resp.json()

    # --------------------------------------------------
    # ENGINE ENDPOINTS
    # --------------------------------------------------

    def run_scan(self, target: str, engagement_ref: str = None) -> dict:
        """
        Run a scan and return its findings.

        The engine runs a scan as a job now. It used to run inside this
        request, and a measured scan of a target answering in 0.4 seconds took
        eighty-one against a sixty second read timeout — so the ordinary case
        was that the engine tested a customer's live system and we recorded
        "engine unreachable". We submit, and then collect.
        """
        payload = {"target": target, "wait_seconds": SCAN_INLINE_WAIT_SECONDS}
        if engagement_ref:
            payload["engagement_ref"] = engagement_ref

        accepted = self._post("/api/scan", payload)

        # A short scan comes back finished on the first request.
        if accepted.get("done") and accepted.get("result") is not None:
            return accepted["result"]
        if "run_id" not in accepted:
            # An older engine that still answers synchronously.
            return accepted

        return self.collect_scan(accepted["run_id"])

    def collect_scan(self, run_id: str) -> dict:
        """
        Wait for a scan the engine is running, and return its findings.

        Raises ScanStillRunning, carrying the id, if we give up first: the
        scan is still going, and the caller needs the id to record that and
        collect it later.
        """
        deadline = time.monotonic() + SCAN_COLLECT_SECONDS

        while True:
            status = self._get(f"/api/scans/{run_id}")

            if status.get("done"):
                if status.get("state") == "completed":
                    return status.get("result") or {}
                raise EngineError(
                    f"Scan {status.get('state')}: "
                    f"{status.get('reason') or (status.get('result') or {}).get('error') or 'no reason given'}"
                )

            if time.monotonic() >= deadline:
                raise ScanStillRunning(
                    f"The engine is still running this scan after "
                    f"{SCAN_COLLECT_SECONDS:.0f}s; it can be collected later.",
                    run_id=run_id,
                )

            time.sleep(SCAN_POLL_SECONDS)

    def run_llm_scan(self, payload: dict) -> dict:
        """
        Run an LLM Target Red Team scan (multi-turn).
        Payload example:
          {
            "target_name": "Client LLM",
            "adapter": "openai_style",
            "base_url": "https://client-proxy/v1/chat/completions",
            "model": "gpt-4.1-mini",
            "attacks": ["metaprompt_extraction","direct_prompt_injection","crescendosafe"],
            "max_turns": 8
          }
        """
        return self._post("/api/llm-scan", payload)

    def classify_cve(self, text: str) -> dict:
        return self._post("/api/classify-cve", {"text": text})

    def defend_log_text(self, text: str) -> dict:
        """
        Send raw log text to the engine defender for analysis.
        """
        return self._post("/api/defend-log/text", {"text": text})

    def defend_log_file(self, file_bytes: bytes, filename: str) -> dict:
        """
        Send a log file to the engine defender for analysis.
        """
        files = {
            "file": (filename, file_bytes),
        }

        try:
            resp = requests.post(
                f"{self.base_url}/api/defend-log/file",
                headers={"X-API-Key": self.headers["X-API-Key"]},
                files=files,
                timeout=30,
            )
        except requests.RequestException as e:
            raise EngineError(f"Engine unreachable: {e}")

        if not (200 <= resp.status_code < 300):
            raise EngineError(
                f"Engine error {resp.status_code}: {resp.text}"
            )

        return resp.json()
