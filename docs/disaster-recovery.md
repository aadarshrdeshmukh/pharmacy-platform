<![CDATA[# Disaster Recovery Plan

## Table of Contents

- [Recovery Objectives](#recovery-objectives)
- [RDS Backup & Restore](#rds-backup--restore)
- [Velero Backup & Restore](#velero-backup--restore)
- [Application Recovery Procedure](#application-recovery-procedure)
- [Infrastructure Recovery](#infrastructure-recovery)
- [Testing Schedule](#testing-schedule)

---

## Recovery Objectives

| Metric | Target | Justification |
| ------ | ------ | ------------- |
| **RTO** (Recovery Time Objective) | **1 hour** | The EKS cluster can be reprovisioned via Terraform in ~20 minutes, RDS can be restored from snapshot in ~15 minutes, and application redeployment takes ~10 minutes. A 1-hour RTO provides a comfortable buffer for troubleshooting and validation, which is appropriate for a business-critical but non-life-threatening pharmacy management system. |
| **RPO** (Recovery Point Objective) | **24 hours** | Amazon RDS automated backups are configured with a daily backup window, ensuring at most 24 hours of data loss. For pharmacy inventory operations, daily-level data recovery is acceptable since critical prescription records can be cross-referenced with physical records. Point-in-time recovery (PITR) is available for finer granularity if needed, but the 24-hour RPO sets a guaranteed baseline. |

### Risk Assessment

| Scenario | Likelihood | Impact | Mitigation |
| -------- | ---------- | ------ | ---------- |
| Single pod failure | High | Low | Kubernetes auto-restarts via liveness probe |
| Single node failure | Medium | Low | EKS auto-scaling replaces failed nodes |
| AZ failure | Low | Medium | Multi-AZ RDS, pods spread across AZs |
| Region failure | Very Low | Critical | Manual failover to secondary region (out of scope for initial deployment) |
| Data corruption | Low | High | RDS point-in-time recovery, Velero application backups |
| Accidental deletion | Low | High | Velero namespace backup, RDS snapshots, S3 versioning for Terraform state |

---

## RDS Backup & Restore

### Automated Backups

Amazon RDS automated backups are enabled with the following configuration:

| Setting | Value |
| ------- | ----- |
| Backup retention period | 7 days |
| Backup window | 03:00–04:00 UTC (low-traffic period) |
| Multi-AZ deployment | Enabled |
| Storage encryption | AES-256 (AWS KMS) |
| Point-in-time recovery | Enabled |

### Manual Snapshot Creation

Create a manual snapshot before major changes (schema migrations, bulk data operations):

```bash
aws rds create-db-snapshot \
  --db-instance-identifier pharmacy-db \
  --db-snapshot-identifier pharmacy-db-pre-migration-$(date +%Y%m%d-%H%M%S) \
  --region us-east-1
```

### Restore from Automated Backup (Point-in-Time)

```bash
# Restore to a specific point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier pharmacy-db \
  --target-db-instance-identifier pharmacy-db-restored \
  --restore-time "2026-06-15T12:00:00Z" \
  --db-instance-class db.t3.medium \
  --region us-east-1

# Wait for the restored instance to become available
aws rds wait db-instance-available \
  --db-instance-identifier pharmacy-db-restored \
  --region us-east-1

# Update the backend ConfigMap with the new RDS endpoint
kubectl edit configmap backend-config -n pharmacy-app
# Change DB_HOST to the new endpoint

# Restart backend pods to pick up the new configuration
kubectl rollout restart deployment/backend-deployment -n pharmacy-app
```

### Restore from Manual Snapshot

```bash
# List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier pharmacy-db \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table \
  --region us-east-1

# Restore from a specific snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier pharmacy-db-restored \
  --db-snapshot-identifier <SNAPSHOT_IDENTIFIER> \
  --db-instance-class db.t3.medium \
  --region us-east-1
```

---

## Velero Backup & Restore

[Velero](https://velero.io/) is used to back up Kubernetes resources and persistent volumes for the `pharmacy-app` namespace.

### Prerequisites

```bash
# Install Velero CLI
brew install velero   # macOS

# Install Velero server with AWS plugin
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket <YOUR_VELERO_BACKUP_BUCKET> \
  --backup-storage-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./velero-credentials
```

### Create a Backup

```bash
# Backup the entire pharmacy-app namespace
velero backup create pharmacy-app-backup-$(date +%Y%m%d) \
  --include-namespaces pharmacy-app \
  --ttl 720h   # Retain for 30 days

# Verify backup status
velero backup describe pharmacy-app-backup-$(date +%Y%m%d)
velero backup logs pharmacy-app-backup-$(date +%Y%m%d)
```

### Schedule Recurring Backups

```bash
# Create a daily backup schedule (runs at 02:00 UTC)
velero schedule create pharmacy-daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces pharmacy-app \
  --ttl 720h
```

### Restore from Backup

```bash
# List available backups
velero backup get

# Restore a specific backup
velero restore create \
  --from-backup pharmacy-app-backup-20260615 \
  --include-namespaces pharmacy-app

# Monitor restore progress
velero restore describe <RESTORE_NAME>

# Verify pods are running after restore
kubectl get pods -n pharmacy-app
```

### Restore to a Different Cluster

```bash
# On the target cluster, ensure Velero is installed with the same S3 bucket
# Then restore:
velero restore create \
  --from-backup pharmacy-app-backup-20260615 \
  --include-namespaces pharmacy-app \
  --namespace-mappings pharmacy-app:pharmacy-app
```

---

## Application Recovery Procedure

Follow this end-to-end procedure to recover the application from a complete failure:

### Step 1 — Verify Infrastructure

```bash
# Check EKS cluster health
aws eks describe-cluster --name pharmacy-platform-dev --region us-east-1 \
  --query 'cluster.status'

# Check node health
kubectl get nodes

# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier pharmacy-db \
  --query 'DBInstances[0].DBInstanceStatus' \
  --region us-east-1
```

### Step 2 — Restore Database (if needed)

If the database is unavailable or corrupted, follow the [RDS Backup & Restore](#rds-backup--restore) procedure above.

### Step 3 — Restore Kubernetes Resources (if needed)

If Kubernetes resources (Deployments, Services, ConfigMaps, Secrets) are lost:

```bash
# Option A: Restore from Velero backup
velero restore create --from-backup <LATEST_BACKUP> --include-namespaces pharmacy-app

# Option B: Re-apply manifests from source control
kubectl apply -k k8s/base/
```

### Step 4 — Redeploy Application

```bash
# Pull the latest images and redeploy
kubectl set image deployment/backend-deployment \
  pharmacy-backend=<ECR_REPO>/pharmacy-backend:latest \
  -n pharmacy-app

kubectl set image deployment/frontend-deployment \
  pharmacy-frontend=<ECR_REPO>/pharmacy-frontend:latest \
  -n pharmacy-app

# Wait for rollouts
kubectl rollout status deployment/backend-deployment -n pharmacy-app --timeout=300s
kubectl rollout status deployment/frontend-deployment -n pharmacy-app --timeout=300s
```

### Step 5 — Run Database Migrations

```bash
kubectl exec -it deploy/backend-deployment -n pharmacy-app -- npm run migrate
```

### Step 6 — Validate Recovery

```bash
# Health check
curl -f http://<ALB_DNS>/health

# Readiness check (includes DB connectivity)
curl -f http://<ALB_DNS>/ready

# Verify data integrity — check medicine count
curl -H "Authorization: Bearer <JWT_TOKEN>" http://<ALB_DNS>/api/medicines

# Check monitoring stack
kubectl get pods -n monitoring

# Check logging stack
kubectl get pods -n logging
```

### Step 7 — Post-Recovery Actions

- [ ] Notify stakeholders of recovery completion
- [ ] Document the incident timeline and root cause
- [ ] Update runbook if new failure modes were discovered
- [ ] Verify monitoring alerts are active
- [ ] Confirm Velero backup schedule is running

---

## Infrastructure Recovery

If the entire AWS infrastructure needs to be reprovisioned (e.g., accidental deletion, region failover):

### Terraform Recovery

```bash
# The Terraform state is stored in S3 with versioning — pull the latest state
cd terraform/

# Reinitialize Terraform
terraform init

# Verify the state matches expectations
terraform plan

# Recreate all infrastructure
terraform apply
```

### Post-Terraform Steps

After infrastructure is recreated:

1. **Update kubeconfig** for the new EKS cluster:
   ```bash
   aws eks update-kubeconfig --name pharmacy-platform-dev --region us-east-1
   ```

2. **Reinstall Helm charts** (Prometheus, ELK, Vault) — see [Deployment Guide](deployment.md#helm-chart-installations).

3. **Restore application** from Velero backup or re-apply manifests.

4. **Restore database** from the latest RDS snapshot.

5. **Reconfigure Vault** secrets and Kubernetes auth — see [Vault Setup](deployment.md#vault-setup).

6. **Update DNS** records to point to the new ALB endpoint.

---

## Testing Schedule

Regular DR testing ensures the recovery procedures remain valid and the team is trained:

| Test Type | Frequency | Description | Success Criteria |
| --------- | --------- | ----------- | ---------------- |
| **RDS Snapshot Restore** | Monthly | Restore the latest automated snapshot to a temporary instance and verify data integrity. | Restored instance is accessible, data matches expected state, restore completes within 15 minutes. |
| **Velero Backup & Restore** | Monthly | Create a backup, delete the `pharmacy-app` namespace, and restore from the backup. | All pods return to `Running` state, application responds to health checks, restore completes within 10 minutes. |
| **Full DR Simulation** | Quarterly | Simulate a complete failure: destroy infrastructure, restore from Terraform + RDS snapshot + Velero backup. | Full application recovered and serving traffic within 1 hour (RTO target). |
| **Runbook Walkthrough** | Quarterly | Team reviews and updates the DR documentation, assigning roles and responsibilities. | All team members understand their roles, documentation is current, contact information is verified. |
| **Chaos Engineering** | Bi-annually | Use tools like Chaos Monkey or Litmus to introduce random failures and validate auto-recovery mechanisms. | Kubernetes self-healing handles pod/node failures without manual intervention. |

### Post-Test Reporting

After each DR test, document the following:

1. **Date and duration** of the test
2. **Participants** and their roles
3. **Scenario** tested
4. **Actual recovery time** vs. target (RTO/RPO)
5. **Issues encountered** and resolutions
6. **Action items** for improvement
7. **Next test date** scheduled
]]>
