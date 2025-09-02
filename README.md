# 🌙 Lunara — Beauty Booking Platform

A pragmatic, production‑oriented beauty booking platform. Spring Boot 3 + Groovy on the backend, React + TypeScript on the web, and a native iOS app. Real‑time slot locking, Stripe Connect payouts, unified accounts, and HTTPS everywhere (even in local dev).

## Why this project is different
- Real‑time slots: Redis + WebSocket keep availability accurate across all clients
- Unified accounts: every user starts as USER; OWNER/EMPLOYEE are granted by actions
- Stripe Connect (EU‑ready): Direct Charges with Custom flow and Stripe Tax
- Guest booking: unauthenticated users can browse and book
- Opinionated UX: minimalistic UI, smooth calendar→slots transition, single‑tap interactions

## Tech overview
- Backend: Spring Boot 3.5, Groovy, Hibernate, PostgreSQL, Redis, RabbitMQ, WebSocket (w/ TLS), JWT
- Frontend: React 19, TypeScript, shadcn/ui, React Query, React Router 7
- iOS: Swift 6.1.2, iOS 17+, native notifications & in‑app Stripe flows (in progress)
- Infra: Docker Compose (Postgres, Redis, RabbitMQ, Prometheus, Grafana), multi‑stage Dockerfile

## Repository layout
```
beautyhub/
├── src/main/groovy/...         # Spring Boot app (entry: BeautyhubApplication.groovy)
├── src/main/resources/...      # application.properties (HTTPS on :8443 by default)
├── bhfrontend/                 # React app (CRA) with HTTPS dev config
├── docker-compose.yml          # Postgres, Redis, RabbitMQ, backend, monitoring
├── Dockerfile                  # Backend container image
├── TESTING.md                  # Detailed testing guidance
└── README.md
```

## Prerequisites
- JDK 21+ (Gradle toolchain will fetch JDK 24 if needed)
- Node.js 18+ and npm
- Docker Desktop (Compose v2)

## Quick start (local, HTTPS)
1) Copy env template
```bash
cp .env.example .env
```
2) Start services (DB/Cache/MQ)
```bash
docker compose up -d postgres redis rabbitmq
```
3) Run backend (HTTPS 8443)
```bash
./gradlew bootRun
# Health: curl -k https://localhost:8443/actuator/health
```
4) Run frontend (HTTPS 3000)
```bash
cd bhfrontend
npm ci
npm start
# CRA uses HTTPS with bhfrontend/certs (self‑signed). Trust locally if prompted.
```
5) Open the app
- Web: https://localhost:3000
- API base: https://localhost:8443/api

Notes
- The backend is TLS‑on by default (server.port=8443, server.ssl.enabled=true)
- For curl use -k against the self‑signed cert during local dev

## Docker: run the backend in a container
```bash
# Builds the backend image and starts it with infra
docker compose up --build backend
# Health check uses https://localhost:8443/actuator/health (self‑signed)
```

## Useful dev endpoints
- GET https://localhost:8443/api/test/health → UP status
- GET https://localhost:8443/api/test/hello → quick smoke JSON

## Configuration
- Root env: .env.example (copy to .env)
- Frontend env: bhfrontend/.env.example

Key variables you’ll likely touch
```bash
# Database
db_name / user / password via .env → docker‑compose overrides (see docker‑compose.yml)
POSTGRES_DB=beautyhub
POSTGRES_USER=beautyhub_user
POSTGRES_PASSWORD=...
POSTGRES_PORT=5433

# Backend HTTPS
defaults to 8443 TLS; override with SERVER_PORT, SERVER_SSL_* if needed

# JWT
JWT_SECRET=change‑me
JWT_EXPIRATION=86400000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# CORS/WebSocket
CORS_ALLOWED_ORIGINS=...
WEBSOCKET_ALLOWED_ORIGINS=...
```

## Testing
Backend
```bash
./gradlew test
```
- Uses JUnit Platform; current setup includes H2 for unit tests
- See TESTING.md for structure and guidance

Frontend
```bash
cd bhfrontend
npm test
```

## Monitoring (optional)
Enable Prometheus + Grafana
```bash
docker compose --profile monitoring up -d prometheus grafana
# Grafana: http://localhost:3001 (default admin password configurable via .env)
```

## iOS app (status: active development)
- Path: LunaraApp/
- Stack: Swift 6.1.2, iOS 17+
- Open in Xcode 15+. Ensure API base points to https://localhost:8443 for local runs.
- Owner Dashboard: schedule management/views implemented; project wiring is ongoing.

## Design system highlights
- Colors: White #FFFFFF, Charcoal #333333, Warm Gold #BFA054, Light Gray #F5F5F5
- UX: smooth calendar→slots transition, single‑tap date reselection, higher search debounce (800ms)

## Security posture
- HTTPS by default (local and prod)
- JWT auth, role‑based access (USER/EMPLOYEE/OWNER)
- CORS & WebSocket origin allow‑lists
- Runs as non‑root in container image

## Contributing
- Branch from main; small, focused PRs
- Keep README/TESTING.md accurate when behavior changes
- Frontend: format/lint scripts in package.json; Backend: Gradle + Jacoco reports

## License
Proprietary. All rights reserved.

