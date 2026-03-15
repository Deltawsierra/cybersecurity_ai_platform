import requests
from django.conf import settings


class EngineError(Exception):
    pass


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

    def _post(self, path: str, payload: dict) -> dict:
        try:
            resp = requests.post(
                f"{self.base_url}{path}",
                json=payload,
                headers=self.headers,
                timeout=1000,  # prevent Django worker starvation
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

    def run_scan(self, target: str) -> dict:
        return self._post("/api/scan", {"target": target})

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
