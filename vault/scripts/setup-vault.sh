#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# setup-vault.sh – Initialize and Configure HashiCorp Vault for Pharmacy Platform
# ──────────────────────────────────────────────────────────────────────────────
# This script performs the following steps:
#   1. Waits for the Vault pod to become ready in the cluster
#   2. Initializes Vault with a single key share (dev configuration)
#   3. Unseals Vault using the generated unseal key
#   4. Enables the KV v2 secrets engine
#   5. Stores pharmacy application secrets (DB creds, JWT, config)
#   6. Enables Kubernetes authentication
#   7. Configures K8s auth with the cluster's service account
#   8. Creates the pharmacy-backend policy
#   9. Binds the policy to a Vault role for the pharmacy-backend service account
#
# Prerequisites:
#   - kubectl configured and pointing to the target EKS cluster
#   - Vault Helm chart deployed in the 'vault' namespace
#   - vault/policies/pharmacy-backend.hcl present relative to repo root
#
# Usage:
#   chmod +x vault/scripts/setup-vault.sh
#   ./vault/scripts/setup-vault.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

VAULT_NAMESPACE="${VAULT_NAMESPACE:-vault}"
VAULT_POD="${VAULT_POD:-vault-0}"
APP_NAMESPACE="${APP_NAMESPACE:-pharmacy-app}"
APP_SERVICE_ACCOUNT="${APP_SERVICE_ACCOUNT:-pharmacy-backend}"
POLICY_NAME="pharmacy-backend"
VAULT_ROLE="pharmacy-backend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
POLICY_FILE="${REPO_ROOT}/vault/policies/pharmacy-backend.hcl"

# TODO: Replace these placeholder values with real secrets before production use
DB_HOST="${DB_HOST:-pharmacy-platform-dev-mysql.xxxxxx.us-east-1.rds.amazonaws.com}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-pharmacy_db}"
DB_USERNAME="${DB_USERNAME:-pharmacy_admin}"
DB_PASSWORD="${DB_PASSWORD:-CHANGE_ME_BEFORE_PRODUCTION}"
JWT_SECRET="${JWT_SECRET:-CHANGE_ME_GENERATE_STRONG_SECRET}"
APP_ENV="${APP_ENV:-development}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# ── Helper Functions ──────────────────────────────────────────────────────────

info()  { echo "[INFO]  $(date '+%Y-%m-%d %H:%M:%S') $*"; }
warn()  { echo "[WARN]  $(date '+%Y-%m-%d %H:%M:%S') $*" >&2; }
error() { echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2; exit 1; }

vault_exec() {
  kubectl exec -n "${VAULT_NAMESPACE}" "${VAULT_POD}" -- vault "$@"
}

# ── Step 1: Wait for Vault Pod ────────────────────────────────────────────────

info "Waiting for Vault pod '${VAULT_POD}' to be ready in namespace '${VAULT_NAMESPACE}'..."

MAX_RETRIES=30
RETRY_INTERVAL=10
for i in $(seq 1 ${MAX_RETRIES}); do
  if kubectl get pod -n "${VAULT_NAMESPACE}" "${VAULT_POD}" &>/dev/null; then
    POD_STATUS=$(kubectl get pod -n "${VAULT_NAMESPACE}" "${VAULT_POD}" -o jsonpath='{.status.phase}')
    if [[ "${POD_STATUS}" == "Running" ]]; then
      info "Vault pod is running."
      break
    fi
  fi
  if [[ ${i} -eq ${MAX_RETRIES} ]]; then
    error "Vault pod did not become ready after $((MAX_RETRIES * RETRY_INTERVAL)) seconds."
  fi
  warn "Vault pod not ready yet (attempt ${i}/${MAX_RETRIES}). Retrying in ${RETRY_INTERVAL}s..."
  sleep ${RETRY_INTERVAL}
done

# ── Step 2: Initialize Vault ─────────────────────────────────────────────────

info "Checking Vault initialization status..."

INIT_STATUS=$(vault_exec status -format=json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('initialized', False))" 2>/dev/null || echo "false")

if [[ "${INIT_STATUS}" == "false" ]]; then
  info "Initializing Vault (1 key share, 1 threshold – dev configuration)..."
  INIT_OUTPUT=$(vault_exec operator init \
    -key-shares=1 \
    -key-threshold=1 \
    -format=json)

  UNSEAL_KEY=$(echo "${INIT_OUTPUT}" | python3 -c "import sys,json; print(json.load(sys.stdin)['unseal_keys_b64'][0])")
  ROOT_TOKEN=$(echo "${INIT_OUTPUT}" | python3 -c "import sys,json; print(json.load(sys.stdin)['root_token'])")

  info "Vault initialized successfully."
  info "============================================================"
  info "UNSEAL KEY: ${UNSEAL_KEY}"
  info "ROOT TOKEN: ${ROOT_TOKEN}"
  info "============================================================"
  warn "IMPORTANT: Store these credentials securely! They will not be shown again."
else
  info "Vault is already initialized."
  # TODO: In a pre-initialized scenario, load the unseal key and root token
  # from a secure location (e.g., AWS Secrets Manager, KMS-encrypted file).
  warn "Skipping init. Set UNSEAL_KEY and ROOT_TOKEN environment variables if needed."
  UNSEAL_KEY="${UNSEAL_KEY:-}"
  ROOT_TOKEN="${ROOT_TOKEN:-}"
fi

# ── Step 3: Unseal Vault ─────────────────────────────────────────────────────

info "Checking Vault seal status..."

SEAL_STATUS=$(vault_exec status -format=json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('sealed', True))" 2>/dev/null || echo "true")

if [[ "${SEAL_STATUS}" == "true" ]]; then
  if [[ -z "${UNSEAL_KEY}" ]]; then
    error "Vault is sealed but no UNSEAL_KEY is available. Set the UNSEAL_KEY environment variable."
  fi
  info "Unsealing Vault..."
  vault_exec operator unseal "${UNSEAL_KEY}" > /dev/null
  info "Vault unsealed successfully."
else
  info "Vault is already unsealed."
fi

# Export root token for subsequent commands
export VAULT_TOKEN="${ROOT_TOKEN}"

# ── Step 4: Enable KV v2 Secrets Engine ──────────────────────────────────────

info "Enabling KV v2 secrets engine at 'secret/'..."

if vault_exec secrets list -format=json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'secret/' in d else 1)" 2>/dev/null; then
  info "KV v2 secrets engine already enabled at 'secret/'."
else
  vault_exec secrets enable -path=secret kv-v2
  info "KV v2 secrets engine enabled."
fi

# ── Step 5: Store Pharmacy Application Secrets ───────────────────────────────

info "Storing pharmacy application secrets..."

# Database credentials
vault_exec kv put secret/pharmacy-app/db \
  host="${DB_HOST}" \
  port="${DB_PORT}" \
  name="${DB_NAME}" \
  username="${DB_USERNAME}" \
  password="${DB_PASSWORD}"
info "  ✓ Database credentials stored at secret/pharmacy-app/db"

# JWT signing secret
vault_exec kv put secret/pharmacy-app/jwt \
  secret="${JWT_SECRET}"
info "  ✓ JWT secret stored at secret/pharmacy-app/jwt"

# Application configuration
vault_exec kv put secret/pharmacy-app/config \
  env="${APP_ENV}" \
  log_level="${LOG_LEVEL}"
info "  ✓ Application config stored at secret/pharmacy-app/config"

# ── Step 6: Enable Kubernetes Auth Method ────────────────────────────────────

info "Enabling Kubernetes auth method..."

if vault_exec auth list -format=json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'kubernetes/' in d else 1)" 2>/dev/null; then
  info "Kubernetes auth method already enabled."
else
  vault_exec auth enable kubernetes
  info "Kubernetes auth method enabled."
fi

# ── Step 7: Configure Kubernetes Auth ────────────────────────────────────────

info "Configuring Kubernetes auth method..."

# Retrieve the Kubernetes API server details from within the Vault pod
K8S_HOST=$(kubectl exec -n "${VAULT_NAMESPACE}" "${VAULT_POD}" -- \
  sh -c 'echo https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT')

K8S_CA_CERT=$(kubectl exec -n "${VAULT_NAMESPACE}" "${VAULT_POD}" -- \
  cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt)

SA_TOKEN=$(kubectl exec -n "${VAULT_NAMESPACE}" "${VAULT_POD}" -- \
  cat /var/run/secrets/kubernetes.io/serviceaccount/token)

vault_exec write auth/kubernetes/config \
  kubernetes_host="${K8S_HOST}" \
  kubernetes_ca_cert="${K8S_CA_CERT}" \
  token_reviewer_jwt="${SA_TOKEN}" \
  issuer="https://kubernetes.default.svc.cluster.local"

info "Kubernetes auth configured with cluster endpoint: ${K8S_HOST}"

# ── Step 8: Create Pharmacy Backend Policy ───────────────────────────────────

info "Creating Vault policy '${POLICY_NAME}'..."

if [[ ! -f "${POLICY_FILE}" ]]; then
  error "Policy file not found: ${POLICY_FILE}"
fi

# Copy the policy file into the Vault pod and apply it
kubectl cp "${POLICY_FILE}" "${VAULT_NAMESPACE}/${VAULT_POD}:/tmp/pharmacy-backend.hcl"
vault_exec policy write "${POLICY_NAME}" /tmp/pharmacy-backend.hcl

info "Policy '${POLICY_NAME}' created successfully."

# ── Step 9: Create Vault Role for Pharmacy Backend ───────────────────────────

info "Creating Vault role '${VAULT_ROLE}'..."

vault_exec write "auth/kubernetes/role/${VAULT_ROLE}" \
  bound_service_account_names="${APP_SERVICE_ACCOUNT}" \
  bound_service_account_namespaces="${APP_NAMESPACE}" \
  policies="${POLICY_NAME}" \
  ttl=24h

info "Role '${VAULT_ROLE}' created — bound to service account '${APP_SERVICE_ACCOUNT}' in namespace '${APP_NAMESPACE}'."

# ── Summary ───────────────────────────────────────────────────────────────────

info "============================================================"
info "Vault setup complete!"
info "============================================================"
info "  Secrets Engine : secret/ (KV v2)"
info "  Auth Method    : kubernetes"
info "  Policy         : ${POLICY_NAME}"
info "  Role           : ${VAULT_ROLE}"
info "  Bound SA       : ${APP_SERVICE_ACCOUNT}@${APP_NAMESPACE}"
info ""
info "  Secrets stored:"
info "    - secret/pharmacy-app/db     (database credentials)"
info "    - secret/pharmacy-app/jwt    (JWT signing secret)"
info "    - secret/pharmacy-app/config (app configuration)"
info "============================================================"
info ""
warn "TODO: Replace placeholder secret values with real credentials."
warn "TODO: For production, use 5 key shares with a threshold of 3."
warn "TODO: Store unseal keys and root token in a secure vault (e.g., AWS KMS/Secrets Manager)."
