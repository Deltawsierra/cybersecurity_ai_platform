"""
The engine's gates are on the path that points it at a customer.

Six subsystems were built into the engine -- the assurance tuple and change
gate, the authorization-to-effect ledger, the extension lifecycle gate, the
decision twin and remediation replay, route attestation, and the incident
evidence pack -- and a grep of this repository for "assurance",
"/api/extensions", "/api/authority" and "/api/evidence" returned nothing.
The change gate was consulted only by its own HTTP route and its own tests,
so a deployment whose model, tools, routes, policies, hooks and permissions
had all changed since approval ran every scan with nothing objecting.

extensions/gate.py names the realistic failure as "the engine ran for a week
with a changed scanner and nobody read the endpoint". That was not a risk,
it was the shipped configuration.
"""

import json
import logging
from datetime import timedelta
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from ai_engine.services import preflight
from pentest import views
from pentest.models import Engagement, PentestScan

pytestmark = pytest.mark.django_db

User = get_user_model()
TARGET = "https://app.client.example/login"

CLEAN = {
    "assurance": {"verdict": "unchanged", "detail": "the deployment is the one that was approved"},
    "extensions": {"verdict": "ok", "detail": "every loaded extension is the one that was approved"},
    "unattributed": {"effects": []},
}


@pytest.fixture(autouse=True)
def _no_cached_verdict():
    preflight.clear_cache()
    yield
    preflight.clear_cache()


@pytest.fixture()
def factory():
    return APIRequestFactory()


@pytest.fixture()
def analyst():
    return User.objects.create_user(username="analyst", password="x",
                                    role=User.Roles.ANALYST)


@pytest.fixture()
def engagement(analyst):
    now = timezone.now()
    return Engagement.objects.create(
        created_by=analyst, name="Client Q3", status="running",
        scope_hosts=["client.example"],
        testing_window_start=now - timedelta(hours=1),
        testing_window_end=now + timedelta(hours=1),
    )


def launch(factory, user, engagement, answers=None, mode="observe"):
    answers = {**CLEAN, **(answers or {})}
    body = {"url": TARGET, "consent": True, "engagement_id": engagement.pk}
    request = factory.post("/api/pentest/scan/", body, format="json")
    force_authenticate(request, user=user)

    engine = mock.Mock()
    engine.run_scan.return_value = {"results": [{"type": "info"}]}
    engine.assurance_check.return_value = answers["assurance"]
    engine.extension_review.return_value = answers["extensions"]
    engine.unattributed_effects.return_value = answers["unattributed"]

    with mock.patch("pentest.views.target_is_out_of_bounds", return_value=None), \
            mock.patch("pentest.views.CyberEngineClient") as client, \
            mock.patch("pentest.views.render_scan_pdf_bytes", return_value=b"%PDF-"), \
            mock.patch("pentest.views.save_pdf_to_scan"), \
            mock.patch.object(preflight, "mode", return_value=mode):
        client.from_settings.return_value = engine
        response = views.run_pentest_scan(request)
    return response, engine


def test_the_gates_are_asked_before_the_engine_is_pointed_at_anyone(
    factory, analyst, engagement
):
    response, engine = launch(factory, analyst, engagement)

    assert engine.assurance_check.called, "the assurance gate was never consulted"
    assert engine.extension_review.called, "the extension gate was never consulted"
    assert engine.unattributed_effects.called, "the audit query was never asked"
    assert response.status_code < 400


def test_a_blocked_deployment_refuses_the_scan_under_enforce(
    factory, analyst, engagement
):
    blocked = {"assurance": {"verdict": "blocked",
                             "detail": "policies changed in a way that adds capability"}}
    response, engine = launch(factory, analyst, engagement, blocked, mode="enforce")

    assert response.status_code == 409
    assert not engine.run_scan.called, "the scan ran against a blocked deployment"


def test_a_blocked_deployment_is_recorded_but_proceeds_under_observe(
    factory, analyst, engagement
):
    """
    Observe is the default, matching the engine's own extension gate: a gate
    that blocks on the day it is switched on is one somebody turns off. The
    verdict is still recorded, so the record shows what would have been
    refused.
    """
    blocked = {"extensions": {"verdict": "blocked",
                              "detail": "revoked and still loaded: rce"}}
    response, engine = launch(factory, analyst, engagement, blocked, mode="observe")

    assert response.status_code < 400
    assert engine.run_scan.called

    scan = PentestScan.objects.latest("id")
    assert scan.assurance["verdict"] == "blocked"
    assert "rce" in scan.assurance["detail"]


def test_an_engine_that_cannot_be_asked_is_not_an_engine_that_said_yes(
    factory, analyst, engagement
):
    from ai_engine.services.cyberengine_client import EngineError

    request = factory.post("/api/pentest/scan/",
                           {"url": TARGET, "consent": True,
                            "engagement_id": engagement.pk}, format="json")
    force_authenticate(request, user=analyst)

    engine = mock.Mock()
    engine.assurance_check.side_effect = EngineError("connection refused")

    with mock.patch("pentest.views.target_is_out_of_bounds", return_value=None), \
            mock.patch("pentest.views.CyberEngineClient") as client, \
            mock.patch.object(preflight, "mode", return_value="enforce"):
        client.from_settings.return_value = engine
        response = views.run_pentest_scan(request)

    assert response.status_code == 409
    assert not engine.run_scan.called


def test_an_unapproved_deployment_is_blocked_not_unchanged(
    factory, analyst, engagement
):
    """
    "nobody approved this" and "this is what was approved" must not share an
    outcome, or the gate reports a deployment nobody ever signed off as one
    that still matches its approval.
    """
    unapproved = {"assurance": {"verdict": "unapproved",
                                "detail": "no approval on record"}}
    response, _ = launch(factory, analyst, engagement, unapproved, mode="enforce")
    assert response.status_code == 409


def test_the_verdict_is_stored_on_the_scan_it_governed(
    factory, analyst, engagement
):
    """A verdict in a log file is not next to the work it governed."""
    launch(factory, analyst, engagement)

    scan = PentestScan.objects.latest("id")
    assert scan.assurance is not None
    assert scan.assurance["verdict"] == "ok"
    assert scan.assurance["deployment_id"] == "mythos-platform"


def test_unattributed_effects_are_reported_without_blocking(
    factory, analyst, engagement
):
    """A fact about the past, not about this scan -- but it belongs in the record."""
    noisy = {"unattributed": {"effects": [{"host": "somewhere.example"}]}}
    response, engine = launch(factory, analyst, engagement, noisy, mode="enforce")

    assert response.status_code < 400
    assert engine.run_scan.called
    scan = PentestScan.objects.latest("id")
    assert scan.assurance["verdict"] == "review"
    assert "no authority" in scan.assurance["detail"]


def test_the_declaration_names_every_component_the_engine_requires(self=None):
    """
    The engine refuses a partial tuple rather than filling the gaps in: a
    component that is absent is not "there are none", it is "nobody said".
    """
    declared = preflight.declaration()
    assert set(declared["components"]) == {
        "model", "prompts", "tools", "routes",
        "retrieval", "policies", "hooks", "permissions",
    }


def test_a_missing_yaml_refuses_the_gate_and_not_the_whole_application():
    """
    preflight is imported by pentest.views, which is imported by pentest.urls,
    which is imported by the root URL conf. A module-scope `import yaml` there
    meant a dependency missing from the light requirements set took down every
    route in the application -- the login page included -- rather than the
    governance check. CI caught it as ModuleNotFoundError during URL loading.

    A gate that cannot answer should refuse scans, not the front door.
    """
    import builtins
    from unittest import mock

    real_import = builtins.__import__

    def no_yaml(name, *args, **kwargs):
        if name == "yaml":
            raise ImportError("No module named 'yaml'")
        return real_import(name, *args, **kwargs)

    with mock.patch.object(builtins, "__import__", side_effect=no_yaml):
        with pytest.raises(preflight.DeploymentNotApproved) as refusal:
            preflight.declaration()

    assert "PyYAML" in str(refusal.value)


# ---------------------------------------------------------------------------
# Every spelling of "no"
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("verdict", [
    "blocked", "BLOCKED", "Blocked", " blocked", "blocked ",
    "block", "deny", "denied", "refused", "rejected", "revoked",
])
def test_every_spelling_of_no_refuses_the_scan(
    factory, analyst, engagement, verdict
):
    """
    audit/middleware.py already learned this one directory away, and says so:
    reading only the exact token meant "deny" was read as permission. This
    module re-introduced it -- `verdict == "blocked"`, case-sensitive and
    untrimmed -- so eleven spellings of no ran the scan under enforce.

    The engine's gate is a separate codebase. One release that capitalises a
    verdict or renames blocked to denied would have turned this gate off with
    no error anywhere, while the scan row went on recording that a verdict
    had been collected.
    """
    answers = {"assurance": {"verdict": verdict, "detail": "widened"}}
    response, engine = launch(factory, analyst, engagement, answers, mode="enforce")

    assert response.status_code == 409, f"{verdict!r} was read as advisory"
    assert not engine.run_scan.called


@pytest.mark.parametrize("verdict", ["unapproved", "UNAPPROVED", "no_approval"])
def test_every_spelling_of_unapproved_refuses_the_scan(
    factory, analyst, engagement, verdict
):
    answers = {"assurance": {"verdict": verdict, "detail": "nothing on record"}}
    response, _ = launch(factory, analyst, engagement, answers, mode="enforce")
    assert response.status_code == 409


def test_a_verdict_nobody_recognises_is_not_a_yes(factory, analyst, engagement):
    """
    A verdict in none of the known sets is a verdict this does not understand,
    and not understood is not permission. The perverse case before: an engine
    answering "unknown" was read as review and proceeded, while an engine
    answering in an unparseable *shape* refused -- so saying "I don't know"
    was treated as safer than saying nothing.
    """
    answers = {"assurance": {"verdict": "unknown", "detail": "cannot tell"}}
    response, engine = launch(factory, analyst, engagement, answers, mode="enforce")

    assert response.status_code == 409
    assert not engine.run_scan.called


# ---------------------------------------------------------------------------
# The declaration file must not be able to refuse more than the gate
# ---------------------------------------------------------------------------

def test_a_missing_declaration_does_not_refuse_scans_in_observe(
    factory, analyst, engagement, monkeypatch, tmp_path
):
    """
    declaration() raised straight out of check(), outside any mode check, so a
    missing file refused every scan in observe -- which the module docstring
    and mode() both promise never blocks. deployment/ is a new directory
    holding one file, and any build that COPYs specific app dirs or packages a
    wheel loses it.
    """
    monkeypatch.setattr(preflight, "DECLARATION", tmp_path / "gone.yaml")
    response, engine = launch(factory, analyst, engagement, mode="observe")

    assert response.status_code < 400, response.data
    assert engine.run_scan.called
    scan = PentestScan.objects.latest("id")
    assert scan.assurance["verdict"] == "unknown"


@pytest.mark.parametrize("body,reason", [
    ("- a\n- b\n", "a list rather than an object"),
    ("deployment_id: 2024-01-01\ncomponents: {a: 1}\n", "a date, not text"),
    ("deployment_id: x\ncomponents: notamapping\n", "components not an object"),
    ("deployment_id: x\ncomponents: {a: 1}\ncomponents: {a: 2}\n", "duplicate key"),
])
def test_a_declaration_this_cannot_read_is_a_refusal_not_a_500(
    body, reason, monkeypatch, tmp_path
):
    """
    A list reached the view as AttributeError; an unquoted date passed the
    truthiness check and then killed objects.create because a date is not JSON
    serialisable -- after the gate had already said yes. A duplicate key won
    silently, so a second components block appended to the bottom of the file
    beat the one a reviewer reads at the top.
    """
    path = tmp_path / "declaration.yaml"
    path.write_text(body)
    monkeypatch.setattr(preflight, "DECLARATION", path)

    with pytest.raises(preflight.DeploymentNotApproved):
        preflight.declaration()


def test_a_declaration_full_of_aliases_is_refused(monkeypatch, tmp_path):
    """
    PyYAML shares references for aliases, so the file parses cheaply and then
    expands when it is serialised as JSON for the engine, where there are no
    aliases. 360 bytes became a 66MB outbound POST built in the worker.
    """
    path = tmp_path / "declaration.yaml"
    path.write_text(
        "a: &a [x, x, x, x, x, x, x, x, x]\n"
        "b: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a]\n"
        "deployment_id: x\n"
        "components: {tools: *b}\n"
    )
    monkeypatch.setattr(preflight, "DECLARATION", path)

    with pytest.raises(preflight.DeploymentNotApproved):
        preflight.declaration()


# ---------------------------------------------------------------------------
# Blast radius
# ---------------------------------------------------------------------------

def test_the_refusal_does_not_hand_the_caller_the_engines_whole_report(
    factory, analyst, engagement
):
    """
    The 409 returned refusal.report verbatim, and that report carries
    `unattributed` -- by definition the effects that reached the network with
    no authority in force, naming hosts from other engagements and other
    tenants -- plus the engine's extension inventory with filesystem paths.
    """
    answers = {
        "assurance": {"verdict": "blocked", "detail": "widened"},
        "unattributed": {"effects": [
            {"host": "vpn.other-tenant.example", "tenant": "acme-bank"},
        ]},
        "extensions": {"verdict": "ok", "detail": "fine",
                       "loaded": [{"name": "rce", "path": "/opt/engine/ext/rce.py"}]},
    }
    response, _ = launch(factory, analyst, engagement, answers, mode="enforce")

    assert response.status_code == 409
    body = json.dumps(response.data)
    assert "other-tenant" not in body, body
    assert "/opt/engine" not in body, body
    # The caller still learns why they were refused.
    assert response.data["assurance"]["verdict"] == "blocked"


def test_a_hostile_engine_cannot_write_an_unbounded_blob_to_the_scan_row(
    factory, analyst, engagement
):
    """Containers were bounded and strings were not."""
    answers = {"assurance": {"verdict": "review", "detail": "x" * 500_000}}
    launch(factory, analyst, engagement, answers, mode="observe")

    scan = PentestScan.objects.latest("id")
    assert len(json.dumps(scan.assurance)) < 50_000, "the report was not bounded"


def test_the_llm_redteam_path_asks_the_gates_too(factory, analyst, engagement):
    """
    The multi-turn prompt-injection run against a customer's live LLM endpoint
    was the one scan path with no gate on it, so an operator who set enforce
    and verified /api/pentest/scan/ had an untouched bypass one endpoint over.
    """
    request = factory.post(
        "/api/pentest/llm-scan/",
        {"base_url": TARGET, "consent": True, "engagement_id": engagement.pk,
         "adapter": "openai_style", "attacks": ["direct_prompt_injection"]},
        format="json",
    )
    force_authenticate(request, user=analyst)

    engine = mock.Mock()
    engine.assurance_check.return_value = {"verdict": "blocked", "detail": "widened"}
    engine.extension_review.return_value = CLEAN["extensions"]
    engine.unattributed_effects.return_value = CLEAN["unattributed"]

    with mock.patch("pentest.views.target_is_out_of_bounds", return_value=None), \
            mock.patch("pentest.views.CyberEngineClient") as client, \
            mock.patch.object(preflight, "mode", return_value="enforce"):
        client.from_settings.return_value = engine
        response = views.run_llm_pentest_scan(request)

    assert response.status_code == 409, response.data
    assert not engine.run_llm_scan.called


@pytest.mark.parametrize("value,expected", [
    ("enforcing", "enforce"), ("ENFORCE", "enforce"), ("strict", "enforce"),
    ("permissive", "observe"), ("monitor", "observe"), ("off", "observe"),
])
def test_the_mode_understands_the_words_an_operator_would_type(
    value, expected, settings
):
    """
    `enforcing` and `permissive` are SELinux's vocabulary and the likeliest
    thing an ops engineer types; `enforcing` reads as strictly stronger than
    `enforce` and used to yield a disabled gate, silently.
    """
    settings.CYBERENGINE_ASSURANCE_MODE = value
    assert preflight.mode() == expected


def test_an_unrecognised_mode_is_not_silent(settings, caplog):
    settings.CYBERENGINE_ASSURANCE_MODE = "enfroce"
    with caplog.at_level(logging.ERROR):
        assert preflight.mode() == "observe"
    assert any("not a value this understands" in r.message for r in caplog.records)


def test_a_non_json_engine_reply_does_not_500_the_scan_path(
    factory, analyst, engagement
):
    """
    resp.json() sat outside the try in both _get and _post, so a 200 carrying
    an HTML error page from a reverse proxy raised JSONDecodeError through
    preflight -- which catches EngineError -- and out of the view as a 500, on
    the path that runs before a scan row exists.
    """
    from ai_engine.services.cyberengine_client import EngineError

    request = factory.post(
        "/api/pentest/scan/",
        {"url": TARGET, "consent": True, "engagement_id": engagement.pk},
        format="json",
    )
    force_authenticate(request, user=analyst)

    engine = mock.Mock()
    engine.assurance_check.side_effect = ValueError("Expecting value: line 1 column 1")

    with mock.patch("pentest.views.target_is_out_of_bounds", return_value=None), \
            mock.patch("pentest.views.CyberEngineClient") as client, \
            mock.patch("pentest.views.render_scan_pdf_bytes", return_value=b"%PDF-"), \
            mock.patch("pentest.views.save_pdf_to_scan"), \
            mock.patch.object(preflight, "mode", return_value="observe"):
        client.from_settings.return_value = engine
        engine.run_scan.return_value = {"results": []}
        response = views.run_pentest_scan(request)

    assert response.status_code < 500, "a non-JSON engine reply reached the caller as a 500"
