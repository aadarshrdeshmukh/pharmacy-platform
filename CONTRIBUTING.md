<![CDATA[# Contributing to Pharmacy Platform

Thank you for your interest in contributing to the Pharmacy Inventory & Prescription Management Platform! This document outlines our development standards, branching strategy, and workflow to ensure a consistent, high-quality codebase.

---

## Table of Contents

- [Branch Strategy](#branch-strategy)
- [Git Workflow](#git-workflow)
- [Commit Conventions](#commit-conventions)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Development Setup](#development-setup)

---

## Branch Strategy

We follow a **Git Flow**-inspired branching model with clearly defined branch types:

```
main ──────────────────────────────────────────────────► (production)
  │
  ├── release/1.0.0 ──────────────────────► (merged to main + develop)
  │
  ├── hotfix/fix-login-bug ────────────────► (merged to main + develop)
  │
  └── develop ─────────────────────────────► (integration branch)
        │
        ├── feature/add-prescription-api ──► (merged to develop)
        ├── feature/inventory-dashboard ───► (merged to develop)
        └── feature/vault-integration ─────► (merged to develop)
```

### Branch Types

| Branch | Pattern | Merges To | Purpose |
| ------ | ------- | --------- | ------- |
| **main** | `main` | — | Production-ready code. Every commit is a release. Protected branch with required reviews. |
| **develop** | `develop` | `main` (via release branch) | Integration branch for feature development. All features are merged here first. |
| **feature** | `feature/<description>` | `develop` | New features, enhancements, or non-urgent bug fixes. One feature per branch. |
| **hotfix** | `hotfix/<description>` | `main` + `develop` | Critical production fixes that cannot wait for the next release cycle. |
| **release** | `release/<version>` | `main` + `develop` | Release preparation — version bumps, final testing, and documentation updates. |

### Branch Protection Rules

The following rules are enforced on `main` and `develop`:

- ✅ Require pull request before merging
- ✅ Require at least 1 approving review
- ✅ Require status checks to pass (CI pipeline)
- ✅ Require branches to be up to date before merging
- ❌ No direct pushes allowed

---

## Git Workflow

### Starting a New Feature

```bash
# Ensure develop is up to date
git checkout develop
git pull origin develop

# Create a feature branch
git checkout -b feature/add-prescription-api

# Make your changes, commit frequently
git add .
git commit -m "feat(prescriptions): add CRUD endpoints for prescriptions"

# Push and create a PR
git push -u origin feature/add-prescription-api
```

### Creating a Hotfix

```bash
# Branch from main for urgent production fixes
git checkout main
git pull origin main
git checkout -b hotfix/fix-auth-token-expiry

# Fix the issue, commit
git add .
git commit -m "fix(auth): extend JWT token expiry validation"

# Push and create PR to main
git push -u origin hotfix/fix-auth-token-expiry
# After merging to main, also merge to develop
```

### Preparing a Release

```bash
# Branch from develop
git checkout develop
git pull origin develop
git checkout -b release/1.2.0

# Bump version numbers, update changelog
git commit -m "chore(release): prepare v1.2.0"

# Push and create PR to main
git push -u origin release/1.2.0
# After merging to main, also merge back to develop
```

---

## Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for clear, machine-readable commit history.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
| ---- | ----------- | ------- |
| `feat` | A new feature | `feat(medicines): add batch expiry tracking` |
| `fix` | A bug fix | `fix(auth): resolve JWT refresh token race condition` |
| `docs` | Documentation changes | `docs(readme): update deployment instructions` |
| `style` | Code style changes (formatting, semicolons, etc.) | `style(backend): apply ESLint auto-fix` |
| `refactor` | Code restructuring without changing behavior | `refactor(db): extract query builders into modules` |
| `test` | Adding or updating tests | `test(medicines): add unit tests for stock validation` |
| `chore` | Build, CI, or tooling changes | `chore(ci): add Node.js 20 to test matrix` |
| `perf` | Performance improvements | `perf(api): add database query indexing` |
| `ci` | CI/CD configuration changes | `ci(jenkins): add parallel test execution` |
| `build` | Build system changes | `build(docker): optimize multi-stage Dockerfile` |
| `revert` | Reverts a previous commit | `revert: feat(medicines): add batch expiry tracking` |
| `infra` | Infrastructure changes (Terraform, K8s) | `infra(eks): increase node group max capacity` |

### Scopes

| Scope | Description |
| ----- | ----------- |
| `auth` | Authentication and authorization |
| `medicines` | Medicine inventory management |
| `prescriptions` | Prescription processing |
| `dashboard` | Dashboard and analytics |
| `db` | Database, migrations, seeds |
| `api` | General API changes |
| `docker` | Docker and Docker Compose |
| `k8s` | Kubernetes manifests |
| `terraform` | Infrastructure as Code |
| `jenkins` | CI/CD pipeline |
| `monitoring` | Prometheus, Grafana |
| `logging` | ELK stack |
| `vault` | HashiCorp Vault |

### Examples

```bash
# Good ✅
feat(medicines): add low-stock alert threshold configuration
fix(prescriptions): prevent duplicate prescription submission
docs(deployment): add Vault setup instructions
infra(terraform): add RDS multi-AZ configuration
test(auth): add integration tests for login endpoint
chore(deps): upgrade express to 4.21.0

# Bad ❌
update code
fixed bug
WIP
misc changes
```

---

## Code Standards

### JavaScript / Node.js (Backend)

- **Runtime:** Node.js 20+ with ES2022 features
- **Style:** Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) conventions
- **Linting:** ESLint with recommended rules
- **Formatting:** Consistent 2-space indentation, single quotes, semicolons
- **Error Handling:** Always use try-catch blocks in async handlers; never swallow errors silently
- **Logging:** Use **Pino** logger — never `console.log` in production code
- **Security:**
  - Validate all inputs with `express-validator`
  - Never expose stack traces in API responses
  - Use parameterized queries (Knex.js) — never concatenate SQL strings
- **Testing:** Write unit tests with **Jest** and **Supertest**; aim for >80% coverage on business logic

### React (Frontend)

- **Version:** React 18+ with functional components and hooks
- **State Management:** React Context + useReducer for global state
- **API Calls:** Centralized API service module with error handling
- **Styling:** CSS modules or styled-components — avoid inline styles
- **Testing:** Jest + React Testing Library

### Docker

- **Multi-stage builds** — Separate build and runtime stages
- **Non-root user** — Run containers as a non-root user
- **`.dockerignore`** — Exclude `node_modules`, `.git`, test files, and docs
- **Health checks** — Include `HEALTHCHECK` instructions

### Kubernetes

- **Labels** — Apply standard labels (`app.kubernetes.io/name`, `app.kubernetes.io/part-of`, `app.kubernetes.io/component`)
- **Resource limits** — Always define CPU/memory requests and limits
- **Probes** — Configure both liveness and readiness probes
- **Secrets** — Never commit real secrets; use placeholders with `# TODO` comments

### Terraform

- **Modules** — Use modules for reusable infrastructure components
- **Variables** — Parameterize all environment-specific values
- **State** — Remote state in S3 with DynamoDB locking
- **Naming** — Use `kebab-case` for resource names, `snake_case` for variables

---

## Pull Request Process

### Before Opening a PR

1. ✅ Rebase your branch on the latest `develop` (or `main` for hotfixes)
2. ✅ Run all tests locally: `npm test`
3. ✅ Run linting: `npm run lint` (if configured)
4. ✅ Ensure Docker Compose builds cleanly: `docker-compose build`
5. ✅ Update documentation for any API or configuration changes

### Opening the PR

1. Use the [Pull Request Template](/.github/PULL_REQUEST_TEMPLATE.md) — fill out all sections
2. Assign at least one reviewer
3. Add appropriate labels (`feature`, `bugfix`, `infrastructure`, `documentation`)
4. Link related issues

### Review Process

- Reviewers should respond within **1 business day**
- Address all review comments — resolve conversations when fixed
- Squash commits into logical units before merging
- Use **Squash and Merge** for feature branches

### After Merging

- Delete the feature branch (GitHub does this automatically if configured)
- Verify the CI/CD pipeline completes successfully
- If deploying to production, monitor metrics and logs for 30 minutes post-deployment

---

## Development Setup

For local development setup instructions, see the [README — Local Development](README.md#local-development) section.

### Quick Start

```bash
git clone https://github.com/your-org/pharmacy-platform.git
cd pharmacy-platform
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Default login: `admin@pharmacy.com` / `admin123`
]]>
