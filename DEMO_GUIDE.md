# 🏥 Pharmacy Platform — Demo & Examination Guide

> **Student:** Aadarsh Deshmukh
> **Project:** Pharmacy Inventory & Prescription Management Platform
> **Repo:** https://github.com/aadarshrdeshmukh/pharmacy-platform

---

## Project Overview

A full-stack **Pharmacy Inventory & Prescription Management Platform** built with a complete DevOps pipeline. The application manages medicine inventory, prescriptions, low-stock alerts, and analytics — while showcasing industry-standard DevOps practices.

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React.js (SPA with Nginx) |
| Backend | Node.js + Express REST API |
| Database | MySQL 8.0 |
| Containerization | Docker + Docker Compose |
| Orchestration | Kubernetes (Minikube + AWS EKS) |
| CI/CD | Jenkins + GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Secret Management | HashiCorp Vault |
| Infrastructure as Code | Terraform (AWS) |
| Cloud | AWS (EKS, RDS, S3, ECR, CloudWatch) |

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend   │────▶│   MySQL DB  │
│  React:3000  │     │ Express:3001│     │    :3306    │
└──────┬───────┘     └──────┬───────┘     └─────────────┘
       │                    │
       │              ┌─────▼───────┐
       │              │  /metrics   │
       │              └─────┬───────┘
       │                    │
  ┌────▼────┐        ┌─────▼───────┐     ┌─────────────┐
  │ Nginx   │        │ Prometheus  │────▶│  Grafana    │
  │ :80     │        │   :9090     │     │   :3002     │
  └─────────┘        └─────────────┘     └─────────────┘
```

---

## 🚀 Quick Start — One Command Demo

```bash
cd ~/Desktop/SEM\ 4/DevOPS/pharmacy-platform

# Start ALL services (App + Monitoring + Jenkins)
docker compose -f docker-compose.full.yml up -d
```

### All Dashboards
| Service | URL | Login |
|---------|-----|-------|
| **Pharmacy Website** | http://localhost:3000 | `admin@pharmacy.com` / `admin123` |
| **Backend Health** | http://localhost:3001/health | — |
| **Backend Metrics** | http://localhost:3001/metrics | — |
| **Prometheus** | http://localhost:9090 | No login |
| **Grafana** | http://localhost:3002 | `admin` / `admin123` |
| **Jenkins** | http://localhost:8080 | Admin setup |
| **MySQL** | localhost:3307 | `pharmacy` / `pharmacy123` |

> **💡 Tip:** If `docker-compose.full.yml` has issues, use the basic one:
> `docker compose up -d` (starts only App + MySQL)

---

## 📋 Demo Walkthrough (Section by Section)

### 1️⃣ Website Demo
Open http://localhost:3000

| Page | What to Show | What to Say |
|------|-------------|-------------|
| Landing Page | Hero section, features | *"This is the public landing page of our pharmacy platform"* |
| Login | Enter credentials, JWT auth | *"Authentication uses JWT tokens stored in localStorage"* |
| Dashboard | Summary cards, stats | *"Dashboard shows real-time inventory and prescription stats"* |
| Inventory | CRUD operations, search | *"Full CRUD — add, edit, delete medicines with stock tracking"* |
| Prescriptions | Create prescription | *"Create prescriptions that automatically deduct stock"* |
| Alerts | Low-stock medicines | *"Automated alerts when stock falls below reorder threshold"* |

---

### 2️⃣ Docker (Containerization)
```bash
# Show running containers
docker ps

# Show Docker images
docker images | grep pharmacy

# Show Dockerfiles
cat app/backend/Dockerfile
cat app/frontend/Dockerfile
```

**What to say:** *"We use multi-stage Docker builds — the backend uses Node.js Alpine, the frontend builds with React and serves via Nginx. Docker Compose orchestrates all services locally."*

**Key files:** `docker-compose.yml`, `docker-compose.full.yml`, `app/backend/Dockerfile`, `app/frontend/Dockerfile`

---

### 3️⃣ Kubernetes (Minikube)
```bash
# Start Minikube (if not already running)
minikube start --memory=4096

# Apply manifests
kubectl apply -f k8s/base/ -n pharmacy-app

# Show all resources
kubectl get all -n pharmacy-app
kubectl get pods -n pharmacy-app
kubectl get svc -n pharmacy-app
kubectl get deployments -n pharmacy-app
```

**What to say:** *"Kubernetes manages our containers in production. We have Deployments for frontend and backend, a StatefulSet for MySQL, and Services for internal networking. This runs on Minikube locally and AWS EKS in the cloud."*

**Key files:** `k8s/base/backend-deployment.yaml`, `k8s/base/frontend-deployment.yaml`, `k8s/base/mysql-statefulset.yaml`

---

### 4️⃣ Monitoring (Prometheus + Grafana)

**Option A — Docker Compose (easiest):**
Already running at http://localhost:9090 (Prometheus) and http://localhost:3002 (Grafana)

**Option B — Kubernetes:**
```bash
kubectl port-forward svc/kube-prometheus-stack-grafana 3002:80 -n monitoring &
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring &
```

**Demo steps:**
1. Open **Prometheus** → Type `up` → Execute → Shows all targets
2. Open **Grafana** → Dashboards → Browse → Show Node Exporter dashboard
3. Show http://localhost:3001/metrics → Raw Prometheus metrics from backend

**What to say:** *"Prometheus scrapes metrics from our backend every 15 seconds. The backend exposes custom metrics like HTTP request counts, response times, and low-stock medicine counts. Grafana visualizes these metrics in real-time dashboards."*

**Key files:** `monitoring/prometheus.yml`, `app/backend/src/metrics.js`

---

### 5️⃣ Secret Management (Vault)
```bash
kubectl port-forward svc/vault 8200:8200 -n vault &
```
Open http://localhost:8200 → Login with root token

**What to say:** *"HashiCorp Vault securely stores sensitive data like database credentials and JWT secrets. Applications fetch secrets at runtime instead of hardcoding them in config files."*

**Key files:** `k8s/helm-values/vault.yaml`

---

### 6️⃣ Jenkins (CI/CD Pipeline)
Open http://localhost:8080 → Show `pharmacy-pipeline`

**What to say:** *"Jenkins is our on-premises CI/CD server. The pipeline is defined as code in the Jenkinsfile. It pulls from GitHub, runs tests, builds Docker images, and deploys to Kubernetes."*

**Key files:** `jenkins/Jenkinsfile`

---

### 7️⃣ GitHub Actions (CI/CD)
Open https://github.com/aadarshrdeshmukh/pharmacy-platform/actions

| Workflow | Stages |
|----------|--------|
| **CI — Lint & Test** | Backend Test → Frontend Test → Docker Build |
| **Release & Deploy** | Build Images → Push to ECR → Deploy to EKS |

**What to say:** *"GitHub Actions provides cloud-based CI/CD. On every push to main, it runs unit tests, lints the code, and verifies Docker builds. The Release pipeline builds images, pushes to AWS ECR, and deploys to EKS automatically."*

**Key files:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`

---

### 8️⃣ Terraform (Infrastructure as Code)
```bash
cd terraform/envs/dev

# Show what Terraform manages
terraform plan -var="db_password=pharmacy123" -var="alert_email=admin@pharmacy.com"
```

**57 AWS resources across 6 modules:**
| Module | Resources |
|--------|-----------|
| **Network** | VPC, 4 Subnets, Internet Gateway, NAT Gateway, Route Tables |
| **EKS** | Kubernetes cluster, Managed node group, OIDC provider |
| **RDS** | PostgreSQL instance, Subnet group, Security group |
| **S3** | Terraform state bucket, Backups bucket with lifecycle |
| **IAM** | Jenkins role, Backend IRSA, ALB Controller role |
| **CloudWatch** | Log groups, CPU/Storage alarms, SNS topic |

**What to say:** *"Terraform defines our entire AWS infrastructure as code. We have 6 reusable modules — network, EKS, RDS, S3, IAM, and CloudWatch. Running terraform apply creates all 57 resources automatically. This ensures infrastructure is version-controlled and reproducible."*

**Key files:** `terraform/modules/` directory, `terraform/envs/dev/main.tf`

---

## 📁 Project Structure
```
pharmacy-platform/
├── app/
│   ├── backend/              # Node.js + Express REST API
│   │   ├── src/              # Routes, middleware, metrics, DB
│   │   ├── tests/            # Jest unit tests (10 test cases)
│   │   └── Dockerfile        # Multi-stage Docker build
│   └── frontend/             # React SPA
│       ├── src/              # Pages, components, API client
│       └── Dockerfile        # Multi-stage build + Nginx
├── k8s/
│   ├── base/                 # K8s manifests (Deployments, Services)
│   └── helm-values/          # Prometheus, Vault, ELK configs
├── terraform/
│   ├── modules/              # 6 modules (network, eks, rds, s3, iam, cloudwatch)
│   └── envs/dev/             # Dev environment configuration
├── monitoring/
│   ├── prometheus.yml        # Prometheus scrape config
│   └── grafana/              # Grafana datasource provisioning
├── jenkins/
│   └── Jenkinsfile           # 7-stage CI/CD pipeline
├── .github/
│   └── workflows/            # CI + Release & Deploy pipelines
├── docker-compose.yml        # Basic: App + MySQL
├── docker-compose.full.yml   # Full: App + Prometheus + Grafana + Jenkins
└── README.md
```

---

## 🛑 Stop & Cleanup
```bash
# Stop Docker Compose
docker compose -f docker-compose.full.yml down

# Stop Minikube
minikube stop

# Destroy AWS (saves money!)
cd terraform/envs/dev
terraform destroy -var="db_password=pharmacy123" -var="alert_email=admin@pharmacy.com" -auto-approve
```

---

## 🔑 DevOps Tools Summary (14 Tools)
| # | Tool | Category | Purpose |
|---|------|----------|---------|
| 1 | **Git/GitHub** | Version Control | Source code management, branches, PRs |
| 2 | **Docker** | Containerization | Multi-stage builds, image management |
| 3 | **Docker Compose** | Container Orchestration | Local multi-service setup |
| 4 | **Kubernetes** | Container Orchestration | Production-grade deployment on Minikube + EKS |
| 5 | **Terraform** | Infrastructure as Code | 57 AWS resources across 6 modules |
| 6 | **Jenkins** | CI/CD | On-premise pipeline with Jenkinsfile |
| 7 | **GitHub Actions** | CI/CD | Cloud CI/CD with automated testing + deployment |
| 8 | **Prometheus** | Monitoring | Metrics collection from backend app |
| 9 | **Grafana** | Visualization | Real-time dashboards and alerting |
| 10 | **HashiCorp Vault** | Secret Management | Secure storage for DB creds + JWT secrets |
| 11 | **AWS EKS** | Managed Kubernetes | Production cluster in the cloud |
| 12 | **AWS RDS** | Managed Database | PostgreSQL with automated backups |
| 13 | **AWS ECR** | Container Registry | Docker image storage for CI/CD |
| 14 | **AWS CloudWatch** | Logging & Alerts | Application logs + resource alarms |
