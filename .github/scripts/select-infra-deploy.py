#!/usr/bin/env python3
"""Route AI-only deployment changes away from the full production rollout."""
import os
import re
import subprocess


def git(*args):
    return subprocess.check_output(["git", *args], text=True)


def infrastructure_compose(text):
    # Strip only known AI-owned blocks from this repository's two-space YAML.
    text = re.sub(r"^  (?:ai|ticket-vision):\n(?:^(?: {3,}.*|\s*|\s*#.*)\n)*", "", text, flags=re.M)
    text = re.sub(r"^\s+DAIPHAT_(?:AI_BASE_URL|TICKET_VISION_[A-Z_]+):.*$", "", text, flags=re.M)
    text = re.sub(r"^  ticket_vision_model_cache:.*$", "", text, flags=re.M)
    return "\n".join(line.strip() for line in text.splitlines() if line.strip() and not line.lstrip().startswith("#"))


def main():
    before = os.environ.get("BEFORE_SHA", "")
    sha = os.environ["SOURCE_SHA"]
    deploy = os.environ.get("EVENT_NAME") == "workflow_dispatch" or not before or set(before) == {"0"}
    if not deploy:
        paths = git("diff", "--name-only", before, sha).splitlines()
        for path in paths:
            if path == "docker-compose.prod.yml":
                old = infrastructure_compose(git("show", f"{before}:{path}"))
                new = infrastructure_compose(git("show", f"{sha}:{path}"))
                deploy = deploy or old != new
            elif path.startswith("daiphat-be/infra/") or path in {
                "scripts/deploy-prod.sh", "scripts/bootstrap-tls.sh", "scripts/vps-preflight.sh"
            }:
                deploy = True
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        output.write(f"deploy={'true' if deploy else 'false'}\n")


if __name__ == "__main__":
    main()
