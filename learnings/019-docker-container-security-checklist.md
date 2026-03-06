# 019 — Docker Container Security Checklist

**Severity:** High
**Category:** Docker, Security, DevOps
**Date:** 2026-03-05

## The Mistake

The production Docker configuration had multiple security and operational issues:

1. **Running as root** — no `USER` directive, so the container process runs as UID 0. If the
   application is compromised, the attacker has root access inside the container.
2. **Wrong health check endpoint** — `HEALTHCHECK` used `/health` (liveness) instead of
   `/health/ready` (readiness). Liveness checks answer "is the process alive?" while readiness
   checks answer "can this instance serve traffic?" A container can be alive but not ready
   (e.g., still connecting to Redis).
3. **devDependencies in production image** — `pnpm install` without `--prod` copies test
   frameworks, linters, and build tools into the final image, bloating it and increasing
   attack surface.
4. **npm token baked into Docker layer** — `.npmrc` with auth token copied during build,
   persisted in image layers. Anyone who pulls the image can extract the token.
5. **No Redis volume mounts** — `docker-compose` Redis service had no volume, so data is
   lost on container restart.
6. **Unpinned base images** — `FROM node:latest` instead of a specific version, causing
   non-reproducible builds.

## The Correct Process

### Mandatory checklist for production Docker images:

```dockerfile
# 1. Pin base image version
FROM node:22-alpine AS builder

# 2. Use BuildKit secrets for npm tokens — NEVER copy .npmrc
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) pnpm install --frozen-lockfile

# 3. Production-only dependencies in final stage
FROM node:22-alpine AS runner
RUN pnpm install --prod --frozen-lockfile

# 4. Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# 5. Readiness health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health/ready || exit 1
```

### docker-compose additions:

```yaml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data  # 6. Persist Redis data

volumes:
  redis-data:
```

## Red Flags

- No `USER` directive in Dockerfile (defaults to root)
- `HEALTHCHECK` hitting `/health` instead of `/health/ready`
- `COPY .npmrc` or `ARG NPM_TOKEN` without BuildKit secrets
- `pnpm install` without `--prod` in the final stage
- `FROM node:latest` or any `:latest` tag
- Redis service in docker-compose without a volume mount
- `docker history <image>` showing secrets in layer commands

## Prevention

- **CI lint step** — use `hadolint` to catch common Dockerfile mistakes (missing USER, unpinned
  images, COPY of secrets)
- **Multi-stage builds** — builder stage for compilation, runner stage with only production deps
- **Image scanning** — run `trivy` or `grype` in CI to catch vulnerabilities and leaked secrets
- **Template Dockerfile** — maintain a blessed template with all security requirements baked in;
  new services copy from the template rather than starting from scratch
