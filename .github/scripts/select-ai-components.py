#!/usr/bin/env python3
"""Select AI deployment components from a workflow dispatch or changed paths."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import PurePosixPath


def production_compose_targets() -> tuple[bool, bool]:
    before, after = os.environ.get("BEFORE_SHA", ""), os.environ.get("SOURCE_SHA", "")
    if not before or set(before) == {"0"}:
        return True, True

    def content(ref):
        return subprocess.check_output(["git", "show", f"{ref}:docker-compose.prod.yml"], text=True)

    def block(text, service):
        match = re.search(rf"^  {service}:\n(.*?)(?=^  [a-zA-Z0-9_-]+:|^[a-zA-Z]|\Z)", text, re.M | re.S)
        return "\n".join(line.strip() for line in (match[0] if match else "").splitlines()
                         if line.strip() and not line.lstrip().startswith("#"))

    old, new = content(before), content(after)
    chatbot = block(old, "ai") != block(new, "ai")
    ocr = block(old, "ticket-vision") != block(new, "ticket-vision")
    for key, target in [("DAIPHAT_AI_BASE_URL", "chatbot"), ("DAIPHAT_TICKET_VISION_", "ocr")]:
        values = lambda text: re.findall(rf"^\s+{key}[^\n]*", text, re.M)
        if values(old) != values(new):
            if target == "chatbot":
                chatbot = True
            else:
                ocr = True
    return chatbot, ocr


def selected_for_target(target: str) -> list[str]:
    if target == "chatbot":
        return ["ai"]
    if target == "ocr":
        return ["ticket-vision"]
    if target == "both":
        return ["ticket-vision", "ai"]
    if target != "auto":
        raise ValueError(f"Unsupported target: {target}")
    return []


def select_from_paths(paths: list[str]) -> list[str]:
    chatbot = False
    ocr = False

    for raw_path in paths:
        path_text = str(PurePosixPath(raw_path.strip()))
        if not path_text or path_text == ".":
            continue

        if path_text.endswith((".md", ".rst")):
            continue
        if path_text == "docker-compose.prod.yml":
            changed_chatbot, changed_ocr = production_compose_targets()
            chatbot = chatbot or changed_chatbot
            ocr = ocr or changed_ocr
            continue
        if path_text == "docker-compose.yml" or path_text.startswith("daiphat-ai/scripts/"):
            continue
        if path_text.startswith("daiphat-ai/services/ticket-vision/"):
            ocr = True
            continue
        if path_text.startswith("daiphat-ai/services/chat-bot/"):
            chatbot = True
            continue

        shared = (
            path_text.startswith("daiphat-ai/contracts/")
            or path_text.startswith("daiphat-ai/infra/")
            or path_text.startswith("daiphat-ai/libs/")
            or path_text in {
                "daiphat-ai/.dockerignore",
                "daiphat-ai/pyproject.toml",
            }
            or path_text == "docker-compose.ai.yml"
            or path_text == "scripts/deploy-ai.sh"
            or path_text == ".github/workflows/component-deploy.yml"
        )
        if shared:
            chatbot = True
            ocr = True
            continue

        if path_text == "daiphat-ai/Dockerfile":
            chatbot = True

    # Keep deployment order deterministic when both services are selected.
    components: list[str] = []
    if ocr:
        components.append("ticket-vision")
    if chatbot:
        components.append("ai")
    return components


def write_outputs(components: list[str]) -> None:
    values = {
        "components": json.dumps(components, separators=(",", ":")),
        "has_targets": "true" if components else "false",
    }
    output_path = os.environ.get("GITHUB_OUTPUT")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as output:
            for key, value in values.items():
                output.write(f"{key}={value}\n")
    else:
        for key, value in values.items():
            print(f"{key}={value}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("auto", "chatbot", "ocr", "both"), default="auto")
    args = parser.parse_args()

    try:
        components = (
            selected_for_target(args.target)
            if args.target != "auto"
            else select_from_paths(sys.stdin)
        )
    except ValueError as exc:
        parser.error(str(exc))
        return 2

    write_outputs(components)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
