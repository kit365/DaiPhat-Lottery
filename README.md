# DaiPhat Lottery Platform

DaiPhat is deployed as three application images:

- `daiphat-be`: Spring Boot 3 / Java 21 Core API.
- `daiphat-fe`: React/Vite static bundle served by Nginx.
- `daiphat-ai`: FastAPI intent classification and chat response service.

Production runs on one VPS with Docker Compose. PostgreSQL, Redis, the three application containers, the public Nginx proxy, Certbot, Dozzle and encrypted database backup are isolated with Docker networks. Only ports 80 and 443 are public; the AI service is reachable only by the backend.

## Local development stack

Runtime secrets remain in ignored local files and GitHub Actions Secrets.

```bash
# Use the single ignored local environment file at the repository root:
# .env
docker compose up -d --build
```

Local endpoints:

- Frontend: `http://localhost:5173`
- Backend/Swagger: `http://localhost:8080/swagger-ui/index.html`
- PostgreSQL: `localhost:5434`
- Redis: `localhost:6380`
- AI health/docs: `http://localhost:8000/health`, `http://localhost:8000/docs`

Before pushing a deployable commit, run the clean-snapshot preflight:

```bash
scripts/preflight-deploy.sh
```

The preflight builds the exact committed tree, starts all three images with PostgreSQL and Redis, then verifies AI health, frontend, backend readiness and the frontend-to-backend proxy.

The frontend test suite is active in CI. The backend production package is compiled in CI, while the legacy backend test suite remains a known debt because several old tests still reference domain packages removed during the monolith migration.

## Production deployment phases

### 1. Bootstrap through the INF branch

1. Commit infrastructure separately from unrelated feature work.
2. Run `scripts/preflight-deploy.sh` locally.
3. Push `feature/dp-5-infs`.
4. In GitHub Actions, run **DaiPhat Infrastructure Deploy** once, then run **DaiPhat Backend Deploy**, **DaiPhat Frontend Deploy** and **DaiPhat AI Deploy** with `source_ref=feature/dp-5-infs`.
5. Verify the new VPS over HTTP by IP before pointing DNS.

### 2. Enable the domain and HTTPS

After the domain A/AAAA record points to the VPS:

```bash
cd "$VPS_DEPLOY_PATH"
scripts/bootstrap-tls.sh example.com admin@example.com
```

Nginx switches to the HTTPS template only after a valid certificate exists. Certbot renews certificates automatically.

### 3. Lock releases to main

After bootstrap is stable, merge to `main` and run the relevant component workflow manually with `source_ref=main`. Each verified FE, BE or AI image receives an immutable commit tag; that component's moving `prod` tag is updated only after its VPS healthcheck succeeds.

## GitHub Secrets

Existing secrets:

- `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- `ENV_FILE_CONTENT`
- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_DEPLOY_PATH`

No additional content secret is required. `ENV_FILE_CONTENT` contains the complete ignored `.env.prod` file, including backend runtime, `VITE_*` build variables, the Dozzle username and bcrypt hash, PostgreSQL, Redis and Restic credentials. The workflow extracts only `VITE_*` for the frontend build, generates Dozzle's `users.yml` from the existing hash, then writes the complete runtime file to the VPS with restrictive permissions.

## Database migrations and backup

Flyway is the only schema manager and Hibernate `ddl-auto` remains `none`. Every environment uses the same ordered migration set and its own `flyway_schema_history`; never create migrations named for dev/UAT/prod and never edit a migration already applied to production.

Every backend or full infrastructure deploy creates a PostgreSQL dump before starting a new backend image. Restic currently stores encrypted snapshots in the persistent VPS backup directory; its repository can later be changed to S3-compatible storage through `ENV_FILE_CONTENT`. A failed backup stops the deployment. A component failure restores that component's previous image and never attempts to reverse a database migration.

Useful production commands:

```bash
docker compose --env-file .env.prod --env-file .deploy.env -f docker-compose.prod.yml ps
docker compose --env-file .env.prod --env-file .deploy.env -f docker-compose.prod.yml logs -f backend frontend nginx
docker compose --env-file .env.prod --env-file .deploy.env -f docker-compose.prod.yml run --rm db-backup run
```

Never run `docker compose down -v` against production because it removes persistent data volumes.

## Container logs with Dozzle

Dozzle is mounted at `/dozzle/` after HTTPS is enabled. It uses file-based authentication, disables container actions/shell/MCP, and reaches Docker through a read-only socket proxy. Before TLS is active, access it only through an SSH tunnel:

```bash
ssh -L 9999:127.0.0.1:9999 "$VPS_USER@$VPS_HOST"
```

Then open `http://127.0.0.1:9999/dozzle/`. The deploy workflow generates the protected `users.yml` from these entries in `ENV_FILE_CONTENT`:

```env
DOZZLE_AUTH_USERNAME=admin
DOZZLE_AUTH_PASSWORD_HASH=$2y$...
```

Only the bcrypt hash is stored; the plaintext Dozzle password is not sent to GitHub or the VPS.

Portainer is intentionally not included: it grants much broader container-management privileges, while Dozzle covers the current read-only log requirement.
