import os
import re

from app.core import config as cors_config


def test_render_frontend_origin_matches_production_regex(monkeypatch):
    monkeypatch.delenv("CORS_ORIGIN_REGEX", raising=False)
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setenv(
        "FRONTEND_URL",
        "https://amrad-ifsc-acsi.onrender.com",
    )

    regex = re.compile(cors_config.get_cors_origin_regex())
    assert regex.match("https://amrad-ifsc-acsi.onrender.com")
    assert regex.match("https://amrad-ifsc.onrender.com")


def test_frontend_url_is_normalized_without_trailing_slash(monkeypatch):
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.delenv("EXTRA_CORS_ORIGINS", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "https://amrad-ifsc-acsi.onrender.com/")

    origins = cors_config.get_cors_origins()
    assert "https://amrad-ifsc-acsi.onrender.com" in origins
    assert "https://amrad-ifsc-acsi.onrender.com/" not in origins


def test_explicit_cors_origin_regex_overrides_render_default(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setenv("CORS_ORIGIN_REGEX", r"^https://example\.com$")

    assert cors_config.get_cors_origin_regex() == r"^https://example\.com$"
