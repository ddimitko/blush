# Backend Testing Guide (CI/CD Ready)

This document describes how we test the Spring Boot backend locally and in CI, with a focus on security, determinism, and production parity using Testcontainers.

## Overview
- Languages/Frameworks: Spring Boot 3+, Groovy tests with JUnit 5
- Build: Gradle
- Datastore for tests: PostgreSQL via Testcontainers (ephemeral)
- Profile: `test` (no real secrets, HTTPS disabled in tests)
- Coverage: JaCoCo with a gate enforced in CI
- Security checks: Trivy filesystem scan + GitHub CodeQL

## Test Types
1) Fast unit tests
   - Example: password rules, Jackson configuration, utilities
   - No Spring context; no Docker required
2) Web slice tests
   - MockMvc standalone or `@WebMvcTest` for controller-only concerns
   - No database
3) Persistence tests (preferred)
   - `@DataJpaTest` + Testcontainers PostgreSQL
   - Uses the real PostgreSQL dialect and DDL (`create-drop`) for accuracy
4) Full integration tests (as we grow)
   - `@SpringBootTest` + Testcontainers for Postgres (and optionally Redis/RabbitMQ later)

## Local Prerequisites
- Java 21 toolchain (Gradle config handles this)
- Docker running (required for tests that extend `AbstractPostgresTest`)

If Docker is not available, Postgres-backed tests will be skipped automatically by an assumption in the base test class.

## Running Tests Locally
- Run all tests (unit + integration):
  - `./gradlew test`
- Run a single test class:
  - `./gradlew test --tests com.ddimitko.beautyhub.validation.PasswordValidatorTest`
- Generate coverage report:
  - `./gradlew jacocoTestReport`
  - Open `build/reports/jacoco/test/html/index.html`

Notes:
- The `test` profile is used automatically in CI. Locally, you can also do `SPRING_PROFILES_ACTIVE=test ./gradlew test` if needed.
- Datasource in tests is injected dynamically by Testcontainers; no local Postgres setup is required.

## Test Configuration (test profile)
- File: `src/test/resources/application-test.properties`
- Key points:
  - No real secrets; dummy JWT secret only for tests
  - `spring.jpa.hibernate.ddl-auto=create-drop`
  - Cache disabled; server SSL disabled in tests; logging at INFO for backend package
  - UTC is used for date/time handling

## Testcontainers
- Base class: `AbstractPostgresTest`
  - Starts a PostgreSQL 15 container and wires Spring datasource properties via `@DynamicPropertySource`
  - Assumes Docker is available; if not, tests are skipped (won’t fail the whole suite locally)
- Repository tests should prefer:
  - `@DataJpaTest`
  - `@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)`
  - Extend `AbstractPostgresTest`

## CI/CD Workflow
- Workflow file: `.github/workflows/backend-ci.yml`
- Trigger: on push/PR to `main` and `develop`
- Steps:
  - Checkout repository
  - Setup JDK 21
  - Run Gradle tests (profile `test`)
  - Generate JaCoCo report and upload as CI artifact
  - Security checks: Trivy filesystem scan and GitHub CodeQL analysis

The GitHub-hosted runner has Docker available; Testcontainers will create the ephemeral Postgres automatically. No secrets from the repository are used.

## Coverage Gate
- Enforced by `jacocoTestCoverageVerification` in `build.gradle`
- The initial gate is low to keep the main branch green while we bootstrap tests; we will step it up as coverage grows (targeting 30%+ next, then higher).
- View the latest report in `build/reports/jacoco/test/html/` after running `jacocoTestReport`.

## Writing New Tests
- Location: `src/test/groovy/...`
- Conventions:
  - Use descriptive test method names with quotes, e.g. `"password must be at least 8 chars"`
  - Favor deterministic tests; avoid sleeps/time flakiness (inject `Clock` where needed)
  - Avoid external network calls; mock third-party clients (e.g., Stripe) for unit/slice tests
- For repository tests:
  - Keep them small; persist only what’s required
  - Verify constraints, indexes, and custom queries
- For web/controller tests:
  - Use standalone MockMvc or `@WebMvcTest` and mock dependencies
  - Do not touch the database in web-slice tests
- For integration tests:
  - Use `@SpringBootTest` and Testcontainers
  - Create data via repositories or service methods

## Data and Migrations in Tests
- Schema management: `create-drop` in the `test` profile (per the project preference)
- No automatic test data initialization
- Build data inside tests or via small fixtures/factories

## Secrets & Security Practices
- Never commit real secrets
- Tests rely on ephemeral Postgres and dummy values (e.g., for JWT)
- CI secrets should be stored in GitHub Secrets if needed (none required for current tests)

## Troubleshooting
- Postgres-backed tests skipped locally:
  - Ensure Docker is running; re-run `./gradlew test`
- Coverage gate fails in CI:
  - Run `./gradlew jacocoTestReport` locally and inspect `build/reports/jacoco/test/html/`
  - Add unit/slice tests for logic-heavy classes first to quickly increase coverage
- Testcontainers startup issues:
  - Check Docker is available and you are allowed to run containers

## Roadmap (Increasing Confidence and Coverage)
- Add `@SpringBootTest` integration tests for Auth, Appointments, and Scheduling logic with Testcontainers-backed Postgres
- Mock Stripe and external calls for deterministic tests
- Raise JaCoCo gate to 30%+, then iterate upwards with each test batch

