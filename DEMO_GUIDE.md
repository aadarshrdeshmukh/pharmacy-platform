# 🏥 Pharmacy Platform — Demo & Examination Guide

## Quick Start (Show the Website)

### Step 1: Start the Application
```bash
cd ~/Desktop/SEM\ 4/DevOPS/pharmacy-platform

# Start everything with Docker Compose
docker compose up -d
```

Wait ~30 seconds, then open:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/health
- **Login:** `admin@pharmacy.com` / `admin123`

### Step 2: Walk Through the Website
| Page | URL | What to Show |
|------|-----|-------------|
| Landing Page | http://localhost:3000 | Hero section, features |
| Login | http://localhost:3000/login | Authentication flow |
| Dashboard | http://localhost:3000/dashboard | Summary cards, stats |
| Inventory | http://localhost:3000/inventory | Medicine list, CRUD operations |
| Prescriptions | http://localhost:3000/prescriptions | Create/manage prescriptions |
| Alerts | http://localhost:3000/alerts | Low-stock warnings |

---

## DevOps Components Demo

### 🐳 Docker (Containerization)
```bash
# Show running containers
docker ps

# Show Docker images
docker images | grep pharmacy

# Show docker-compose.yml
cat docker-compose.yml
```
**Key files:** `docker-compose.yml`, `app/backend/Dockerfile`, `app/frontend/Dockerfile`

---

### ☸️ Kubernetes (Minikube)
```bash
# Start Minikube
minikube start --memory=4096

# Show pods
kubectl get pods -n pharmacy-app

# Show services
kubectl get svc -n pharmacy-app

# Show deployments
kubectl get deployments -n pharmacy-app

# Show all resources
kubectl get all -n pharmacy-app
```
**Key files:** `k8s/base/` directory — `backend-deployment.yaml`, `frontend-deployment.yaml`, `mysql-statefulset.yaml`

---

### 📊 Monitoring (Prometheus + Grafana)
```bash
# Port-forward Grafana (in a new terminal)
kubectl port-forward svc/kube-prometheus-stack-grafana 3001:80 -n monitoring &

# Port-forward Prometheus (in a new terminal)
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring &
```

| Dashboard | URL | Credentials |
|-----------|-----|-------------|
| **Grafana** | http://localhost:3001 | `admin` / `prom-operator` |
| **Prometheus** | http://localhost:9090 | No login needed |

**In Grafana:** Go to Dashboards → Browse → Show "Node Exporter" or "Kubernetes" dashboards

**In Prometheus:** Type `up` in the query box → Execute → Shows all monitored targets

**Key files:** `k8s/helm-values/prometheus.yaml`

---

### 🔐 Vault (Secret Management)
```bash
# Port-forward Vault
kubectl port-forward svc/vault 8200:8200 -n vault &
```

| Dashboard | URL | Credentials |
|-----------|-----|-------------|
| **Vault UI** | http://localhost:8200 | Use root token from init |

**Show secrets at:** `secret/pharmacy-app/db` and `secret/pharmacy-app/jwt`

**Key files:** `k8s/helm-values/vault.yaml`

---

### 🔧 Jenkins (CI/CD Pipeline)
```bash
# Start Jenkins
docker start jenkins

# If not already running:
# docker run -d --name jenkins -p 8080:8080 jenkins/jenkins:lts-jdk17
```

| Dashboard | URL | Credentials |
|-----------|-----|-------------|
| **Jenkins** | http://localhost:8080 | `admin` / (initial password) |

**Show:** `pharmacy-pipeline` → Pipeline config → Console output showing Git checkout + stages

**Key files:** `jenkins/Jenkinsfile`

---

### 🚀 GitHub Actions (CI/CD)
Open in browser: **https://github.com/aadarshrdeshmukh/pharmacy-platform/actions**

| Workflow | What it Does |
|----------|-------------|
| **CI — Lint & Test** | Runs backend tests, frontend tests, Docker build verification |
| **Release & Deploy** | Builds Docker images → Pushes to ECR → Deploys to EKS |

---

### ☁️ AWS Infrastructure (Terraform)
```bash
cd terraform/envs/dev

# Show the plan (what would be created)
terraform plan -var="db_password=pharmacy123" -var="alert_email=admin@pharmacy.com"
```

**Resources created (57 total):**
| AWS Service | Resource |
|-------------|----------|
| VPC | 1 VPC, 2 public + 2 private subnets, NAT Gateways |
| EKS | Kubernetes cluster with managed node group |
| RDS | PostgreSQL database (db.t3.micro) |
| S3 | Terraform state bucket + Backups bucket |
| ECR | Container registries for backend + frontend |
| IAM | Jenkins role, Backend IRSA, ALB Controller role |
| CloudWatch | Log groups + SNS alerts for RDS |

**Show in AWS Console:** EKS cluster, RDS database, VPC, S3 buckets, CloudWatch alarms

**Key files:** `terraform/modules/` (network, eks, rds, s3, iam, cloudwatch)

---

## 📁 Project Structure
```
pharmacy-platform/
├── app/
│   ├── backend/          # Node.js + Express API
│   │   ├── src/          # Source code (routes, middleware, metrics)
│   │   ├── tests/        # Jest unit tests
│   │   └── Dockerfile    # Multi-stage Docker build
│   └── frontend/         # React application
│       ├── src/          # Pages, components, API client
│       └── Dockerfile    # Multi-stage with Nginx
├── k8s/
│   ├── base/             # Kubernetes manifests
│   └── helm-values/      # Prometheus, Vault, ELK configs
├── terraform/
│   ├── modules/          # VPC, EKS, RDS, S3, IAM, CloudWatch
│   └── envs/dev/         # Development environment config
├── jenkins/
│   └── Jenkinsfile       # CI/CD pipeline definition
├── .github/
│   └── workflows/        # GitHub Actions CI + Release pipelines
├── docker-compose.yml    # Local development setup
└── README.md
```

---

## 🛑 Stop Everything
```bash
# Stop Docker Compose
docker compose down

# Stop Jenkins
docker stop jenkins

# Stop Minikube
minikube stop

# Destroy AWS resources (IMPORTANT — saves money!)
cd terraform/envs/dev
terraform destroy -var="db_password=pharmacy123" -var="alert_email=admin@pharmacy.com" -auto-approve
```

---

## 🔑 DevOps Tools Summary
| Tool | Purpose | Proof |
|------|---------|-------|
| **Git/GitHub** | Version control | Repository with commits, branches, PRs |
| **Docker** | Containerization | Multi-stage Dockerfiles, Docker Compose |
| **Kubernetes** | Orchestration | Deployments, Services, StatefulSets on Minikube + EKS |
| **Terraform** | Infrastructure as Code | 57 AWS resources across 6 modules |
| **Jenkins** | CI/CD Pipeline | 7-stage pipeline connected to GitHub |
| **GitHub Actions** | CI/CD Pipeline | Automated testing + Docker build + ECR push + EKS deploy |
| **Prometheus** | Metrics collection | Custom app metrics + cluster monitoring |
| **Grafana** | Visualization | Dashboards for Node Exporter, K8s metrics |
| **Vault** | Secret management | KV-v2 secrets engine with DB + JWT secrets |
| **CloudWatch** | AWS Logging & Alerts | Log groups + RDS CPU/Storage alarms |
| **AWS EKS** | Managed Kubernetes | Production cluster with managed nodes |
| **AWS RDS** | Managed Database | PostgreSQL with automated backups |
| **AWS ECR** | Container Registry | Docker image storage |
| **AWS S3** | Object Storage | Terraform state + backups with lifecycle |
