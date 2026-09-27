#!/usr/bin/env python3
"""Decide whether one AI service must be redeployed for a set of changed paths."""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import PurePosixPath

# Legacy daiphat-prod service block and backend env prefix that point at each
# service; both are part of the production contract and keep their old names.
SERVICES = {
    "ai-chatbot": ("ai", "DAIPHAT_AI_BASE_URL"),
    "ai-ticket-ocr": ("ticket-vision", "DAIPHAT_TICKET_VISION_"),
    "ai-ekyc": (None, "DAIPHAT_EKYC_AI_"),
}

SHARED_DEPLOY_FILES = {
    "docker-compose.ai.yml",
    "scripts/deploy-ai.sh",
    ".github/workflows/component-deploy.yml",
    ".github/scripts/select-ai-deploy.py",
}


def production_compose_changed(service: str) -> bool:
    before, after = os.environ.get("BEFORE_SHA", ""), os.environ.get("SOURCE_SHA", "")
    if not before or set(before) == {"0"}:
        return True

    def content(ref: str) -> str:
        return subprocess.check_output(["git", "show", f"{ref}:docker-compose.prod.yml"], text=True)

    def block(text: str, name: str) -> str:
        match = re.search(rf"^  {name}:\n(.*?)(?=^  [a-zA-Z0-9_-]+:|^[a-zA-Z]|\Z)", text, re.M | re.S)
        return "\n".join(line.strip() for line in (match[0] if match else "").splitlines()
                         if line.strip() and not line.lstrip().startswith("#"))

    def env_values(text: str, key: str) -> list[str]:
        return re.findall(rf"^\s+{key}[^\n]*", text, re.M)

    legacy_service, env_key = SERVICES[service]
    old, new = content(before), content(after)
    if legacy_service and block(old, legacy_service) != block(new, legacy_service):
        return True
    return env_values(old, env_key) != env_values(new, env_key)


def should_deploy(service: str, paths: list[str]) -> bool:
    own_workflow = f".github/workflows/{service}-deploy.yml"
    service_prefix = f"daiphat-ai/{service}/"
    for raw_path in paths:
        path_text = str(PurePosixPath(raw_path.strip()))
        if not path_text or path_text == ".":
            continue
        if path_text.endswith((".md", ".rst")):
            continue
        if path_text.startswith(service_prefix):
            return True
        if path_text in SHARED_DEPLOY_FILES or path_text == own_workflow:
            return True
        if path_text == "docker-compose.prod.yml" and production_compose_changed(service):
            return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--service", choices=tuple(SERVICES), required=True)
    args = parser.parse_args()

    deploy = should_deploy(args.service, sys.stdin.read().splitlines())
    line = f"deploy={'true' if deploy else 'false'}\n"
    output_path = os.environ.get("GITHUB_OUTPUT")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as output:
            output.write(line)
    else:
        sys.stdout.write(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
