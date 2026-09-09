# Publish Ticket Vision from local

Only `docker.io/kitops365/daiphat-ticket-vision` is prepared/published. Chatbot,
VPS, production Compose and CI/CD are not touched. The selected repository is
public: source under `/app` and `models/best.pt` will be downloadable by anyone.

Prerequisites: Docker Desktop with AMD64 emulation, Python 3.11+, an existing
public Docker Hub repository, the selected Docker changes committed, and at
least 24 GiB free disk for the heavy dependency image and layer inspection.
Use Docker's interactive `docker login --username kitops365` and a Docker Hub
access token with write permission when ready to push. Do not put the token in
shell arguments, tracked files or Docker build arguments.

Run from the repository root. Preparation reads **only committed source** through
`git archive`, plus the explicitly selected local `best.pt`. Unrelated working
tree edits are not included. Select the commit that contains the agreed Docker
changes; do not stage all outstanding frontend/mobile changes.

```sh
python3 scripts/publish_ticket_vision.py prepare --ref HEAD
```

This checks public repository access and candidate tag absence, then prints
`.local/ocr-publish/<full-commit-sha>`. Substitute that directory below:

```sh
python3 scripts/publish_ticket_vision.py build --release .local/ocr-publish/<full-commit-sha>
python3 scripts/publish_ticket_vision.py verify --release .local/ocr-publish/<full-commit-sha>
```

The script builds `linux/amd64` with Buildx `--load`. It audits all image layers
for forbidden application artifacts and credential signatures outside third-party
`site-packages`, checks non-root runtime/cache/health, verifies the model checksum
and runs YOLO on a synthetic image with networking disabled. Public test vectors
inside dependencies are recorded as skipped third-party files; project source,
configs, tmp/cache files and image metadata remain fail-closed. No ticket photo
or provider credential is used.
If a dependency or emulation error occurs, the release remains unverified.
The script does not change dependency versions or OCR code to force a pass.

Reports include `release.json`, `build.log`, `layer-audit.json`, `runtime.log`,
and `packages.txt`. The exact image ID tested is the one eligible for push.
The snapshot and reports are ignored by Git. Never use `docker compose config`
without filtering output when real environment files are present.

Push is a separate command; build and verify never publish:

```sh
python3 scripts/publish_ticket_vision.py push --release .local/ocr-publish/<full-commit-sha>
```

Tag: `candidate-<full-commit-sha>`. Existing candidate tags are never intentionally
overwritten, and `latest`/`prod` are untouched. Only the verified `linux/amd64`
runtime manifest is pushed; local provenance/attestation wrappers are not published.
This is a client-side check, not
an atomic registry lock: do not run another publisher for the same tag concurrently.
After pushing, the script verifies the manifest/config ID and performs a public
pull by digest using a temporary empty Docker client configuration. It does not
log out or replace the user's Docker credentials. `release.json` records the digest.
If publication succeeds but post-push verification fails, use the read/pull-only
confirmation command; it never re-uploads the image or overwrites the tag:

```sh
python3 scripts/publish_ticket_vision.py confirm --release .local/ocr-publish/<full-commit-sha>
```

Known limits: dependencies remain large and unpinned as requested; repeated
builds are not guaranteed byte-identical. The candidate proves packaging and
YOLO smoke-test compatibility, not PaddleOCR API compatibility, Groq token quota,
recognition accuracy, or native VPS performance. Image/layer signature checks
are not a complete dependency security audit.
