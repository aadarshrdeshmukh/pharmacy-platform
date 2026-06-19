# ──────────────────────────────────────────────────────────────────────────────
# Vault Policy – pharmacy-backend
# ──────────────────────────────────────────────────────────────────────────────
# Grants the pharmacy backend application read-only access to its
# required secrets (database credentials, JWT signing key, and
# application configuration).  All other secret paths are denied.
# ──────────────────────────────────────────────────────────────────────────────

# Allow read access to database credentials
path "secret/data/pharmacy-app/db" {
  capabilities = ["read"]
}

# Allow read access to JWT signing secrets
path "secret/data/pharmacy-app/jwt" {
  capabilities = ["read"]
}

# Allow read access to application configuration secrets
path "secret/data/pharmacy-app/config" {
  capabilities = ["read"]
}

# Deny access to all other secrets
path "secret/data/*" {
  capabilities = ["deny"]
}
