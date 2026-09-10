# AI deployment

`DaiPhat AI Deploy` is the only AI CD entry point. It exposes **OCR** and
**Chatbot** as separate jobs, deploying OCR first when both are selected.
Application tests, benchmarks and smoke-test jobs are not part of this CD flow.
Container health and route rollback remain runtime operations.
The script also refuses to start an overlapping slot when available RAM is
insufficient; OCR retains the 5500 MiB host RAM / 25 GiB free Docker disk floor.

## Configuration

Use the existing `.env.prod` as the source of truth, then copy its complete
contents into the GitHub Actions `ENV_FILE_CONTENT` secret. Editing the ignored
local `.env.prod` does not update that secret. Set a production `GROQ_API_KEY`.
For a new OCR build, also configure the
`TICKET_VISION_WEIGHTS_URL` secret and `TICKET_VISION_WEIGHTS_SHA256` Actions
variable. Existing-digest deploys do not require these build inputs.

Only AI configuration is staged for AI jobs; the VPS's main `.env.prod`,
`.deploy.env`, Dozzle users and production Compose file are not replaced by
an AI rollout. Each slot receives its own environment snapshot. Do not change
the Docker network or proxy image through a slot rollout: those belong to a
separately coordinated gateway migration.

Missing `GROQ_API_KEY` prevents OCR becoming healthy. Gemini/Grok keys and
`FORTUNE_LLM_API_KEY` are not required for the selected Groq OCR engine or the
current chatbot. Use `TICKET_VISION_RECOGNITION_ENGINE`; the older
`OCR_AI_PROVIDER` alias is only used when the canonical setting is absent.

The per-call Groq timeout is 45 seconds in the example; retries and alternate
crops can still exceed that time. This is not an end-to-end request deadline.

## First OCR rollout

Dispatch the workflow with `target=ocr` and `source_ref=main` after these deployment
files are available on that ref. Select `deploy-existing` and provide the full
`docker.io/<account>/daiphat-ticket-vision@sha256:<digest>` to reuse an image;
otherwise select `build-and-deploy`. With an existing image, the selected source
SHA identifies the deployment code, not necessarily the source used to build
the image.

The backend must already use `http://ticket-vision:8090`, and the external
`daiphat-prod_default` network must exist. The new OCR gateway owns the
`ticket-vision` network alias. If a legacy OCR container owns that name, CD
refuses to take it over. Do not enable the root Compose's legacy `ocr` profile
alongside the managed AI project.

## Existing chatbot bootstrap

The first chatbot CD run creates `ai-gateway`, initially forwarding to the
existing `ai:8000` container. It stops before changing chatbot traffic while
the backend still uses the old URL. The original chatbot remains running.

A separately coordinated backend rollout must set
`DAIPHAT_AI_BASE_URL=http://ai-gateway:8000`. This repository does not perform
that backend migration as part of AI CD. Once the backend uses the gateway,
rerun chatbot CD to enable slot deployment. The legacy container is retained;
its eventual retirement is a separate infrastructure action.

## Slot releases and recovery

`docker-compose.ai.yml` owns a separate `daiphat-ai` project, attached to the
existing production network. Chatbot and OCR each have blue/green slots and
an internal Nginx gateway. No AI port is published on the host.

The deployment starts the inactive slot, waits for container health, reloads
the gateway and records the active slot under `.ai-deploy/<component>/active`.
The old slot is stopped only after old Nginx workers finish their requests.
When draining takes more than ten minutes, it stays running and the next
rollout waits instead of overwriting it.

An error before committing the release restores the old route. First-install
failure stops only the new OCR gateway/slot. Cache volumes are retained.
Manual rollback uses `deploy-existing` with the previous image digest and the
matching runtime values in `ENV_FILE_CONTENT`; prior digests are recorded in
`.ai-deploy/<component>/releases/`, alongside protected runtime snapshots.
An interrupted transaction is retained and blocks subsequent deployments until
the live route and the saved transaction have been reconciled under the VPS
deployment lock. Do not delete a transaction directory to bypass this guard.
A successful earlier component is not
rolled back if a later component fails.

Each slot has its own model cache. Two slots must fit on the existing VPS
during a rollout; Docker resource limits are not proof of available capacity.
No host upgrade, resource benchmark or live bootstrap was performed while
implementing this code.
