# 💊 Pharmacy Inventory & Prescription Management Platform

A full-stack, cloud-native platform for managing pharmacy inventory, tracking prescriptions, and automating the complete DevOps lifecycle — from local development to production deployment on AWS EKS.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Manual Steps Required for AWS Deployment](#manual-steps-required-for-aws-deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Pharmacy Platform provides a secure, scalable solution for pharmacies to manage their medicine inventory, process prescriptions, and gain real-time operational insights through an intuitive dashboard. The system is built with a microservices-ready architecture, containerized with Docker, orchestrated on Kubernetes (EKS), and supported by enterprise-grade observability (Prometheus/Grafana), centralized logging (ELK), and secrets management (HashiCorp Vault).

---

## Architecture Overview

The platform follows a three-tier architecture deployed on AWS:

- **Frontend** — React SPA served via Nginx, communicating with the backend REST API.
- **Backend** — Node.js/Express API handling business logic, authentication, and database operations.
- **Database** — Amazon RDS PostgreSQL for persistent, managed data storage.

All components run as containerized workloads on an **Amazon EKS** cluster, fronted by an **Application Load Balancer (ALB)**. CI/CD is powered by **Jenkins**, with images stored in **Amazon ECR**.

> For the full architecture diagram and detailed component descriptions, see [docs/architecture.md](docs/architecture.md).

---

## Tech Stack

| Layer              | Technology                               |
| ------------------ | ---------------------------------------- |
| **Frontend**       | React 18, Nginx                          |
| **Backend**        | Node.js 20, Express 4, Knex.js          |
| **Database**       | PostgreSQL 15 (Amazon RDS)               |
| **Authentication** | JWT (jsonwebtoken), bcryptjs             |
| **Containerization** | Docker, Docker Compose                 |
| **Orchestration**  | Kubernetes (Amazon EKS), Kustomize       |
| **Infrastructure** | Terraform, AWS (VPC, EKS, RDS, ALB, S3) |
| **CI/CD**          | Jenkins (Declarative Pipeline)           |
| **Monitoring**     | Prometheus, Grafana, prom-client         |
| **Logging**        | Elasticsearch, Filebeat, Kibana (ELK)    |
| **Secrets**        | HashiCorp Vault (KV v2)                  |
| **API Security**   | Helmet, CORS, express-validator          |
| **Logging (App)**  | Pino, pino-http                          |

---

## Prerequisites

Ensure the following tools are installed on your machine:

| Tool          | Minimum Version | Purpose                              |
| ------------- | --------------- | ------------------------------------ |
| **Node.js**   | 20.x            | Backend & frontend runtime           |
| **Docker**    | 24.x            | Container builds                     |
| **Docker Compose** | 2.20+       | Local multi-container orchestration  |
| **AWS CLI**   | 2.x             | AWS resource management              |
| **kubectl**   | 1.28+           | Kubernetes cluster interaction       |
| **Terraform** | 1.6+            | Infrastructure as Code               |
| **Helm**      | 3.13+           | Kubernetes package management        |

---

## Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/pharmacy-platform.git
cd pharmacy-platform
```

### 2. Start the Application Stack

```bash
docker-compose up --build
```

This command builds and starts all services (frontend, backend, PostgreSQL) in Docker containers.

### 3. Access the Application

| Service      | URL                        |
| ------------ | -------------------------- |
| **Frontend** | http://localhost:3000       |
| **Backend**  | http://localhost:3001       |
| **API Health** | http://localhost:3001/health |

### 4. Default Admin Credentials

| Field      | Value                  |
| ---------- | ---------------------- |
| **Email**  | `admin@pharmacy.com`   |
| **Password** | `admin123`           |

> ⚠️ **Important:** Change the default credentials immediately after first login in any non-local environment.

### 5. Useful Commands

```bash
# Run backend tests
cd app/backend && npm test

# Run database migrations
cd app/backend && npm run migrate

# Seed the database
cd app/backend && npm run seed

# Stop all containers
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```

---

## Project Structure

```
pharmacy-platform/
├── app/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.js              # Express app entry point
│   │   │   ├── db.js                 # Knex database connection
│   │   │   ├── knexfile.js           # Knex configuration (migrations/seeds)
│   │   │   ├── metrics.js            # Prometheus metrics (prom-client)
│   │   │   ├── middleware/
│   │   │   │   └── auth.js           # JWT authentication middleware
│   │   │   └── routes/
│   │   │       ├── auth.js           # POST /api/auth/login, /register
│   │   │       ├── medicines.js      # CRUD /api/medicines
│   │   │       ├── prescriptions.js  # CRUD /api/prescriptions
│   │   │       └── dashboard.js      # GET  /api/dashboard/stats
│   │   ├── .env.example              # Environment variable template
│   │   ├── Dockerfile                # Backend container image
│   │   └── package.json              # Node.js dependencies & scripts
│   └── frontend/
│       ├── src/                      # React application source
│       ├── Dockerfile                # Frontend container image (Nginx)
│       └── package.json              # Frontend dependencies & scripts
├── jenkins/
│   └── Jenkinsfile                   # Declarative CI/CD pipeline
├── k8s/
│   └── base/
│       ├── namespace.yaml            # Namespace definitions (4 namespaces)
│       ├── backend-deployment.yaml   # Backend Deployment + Service
│       ├── configmap.yaml            # Non-sensitive backend configuration
│       └── secret.yaml               # Sensitive credentials (base64-encoded)
├── docs/
│   ├── architecture.md               # System architecture & diagrams
│   ├── deployment.md                 # Deployment & operations guide
│   └── disaster-recovery.md          # DR procedures & RTO/RPO
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md      # PR template
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI pipeline
├── CONTRIBUTING.md                   # Contribution guidelines
├── docker-compose.yml                # Local development orchestration
└── README.md                         # ← You are here
```

---

## API Endpoints

### System Endpoints

| Method | Endpoint     | Description                         | Auth Required |
| ------ | ------------ | ----------------------------------- | ------------- |
| GET    | `/health`    | Liveness check                      | No            |
| GET    | `/ready`     | Readiness check (includes DB ping)  | No            |
| GET    | `/metrics`   | Prometheus metrics (prom-client)    | No            |

### Authentication — `/api/auth`

| Method | Endpoint              | Description               | Auth Required |
| ------ | --------------------- | ------------------------- | ------------- |
| POST   | `/api/auth/register`  | Register a new user       | No            |
| POST   | `/api/auth/login`     | Authenticate & get JWT    | No            |

### Medicines — `/api/medicines`

| Method | Endpoint               | Description                    | Auth Required |
| ------ | ---------------------- | ------------------------------ | ------------- |
| GET    | `/api/medicines`       | List all medicines             | Yes           |
| GET    | `/api/medicines/:id`   | Get a single medicine by ID    | Yes           |
| POST   | `/api/medicines`       | Add a new medicine             | Yes           |
| PUT    | `/api/medicines/:id`   | Update an existing medicine    | Yes           |
| DELETE | `/api/medicines/:id`   | Delete a medicine              | Yes           |

### Prescriptions — `/api/prescriptions`

| Method | Endpoint                    | Description                       | Auth Required |
| ------ | --------------------------- | --------------------------------- | ------------- |
| GET    | `/api/prescriptions`        | List all prescriptions            | Yes           |
| GET    | `/api/prescriptions/:id`    | Get a single prescription by ID   | Yes           |
| POST   | `/api/prescriptions`        | Create a new prescription         | Yes           |
| PUT    | `/api/prescriptions/:id`    | Update an existing prescription   | Yes           |
| DELETE | `/api/prescriptions/:id`    | Delete a prescription             | Yes           |

### Dashboard — `/api/dashboard`

| Method | Endpoint                | Description                              | Auth Required |
| ------ | ----------------------- | ---------------------------------------- | ------------- |
| GET    | `/api/dashboard/stats`  | Aggregated dashboard statistics          | Yes           |

---

## Manual Steps Required for AWS Deployment

> **⚠️ The Terraform and Kubernetes manifests contain placeholder values that must be configured before deploying to AWS.** This section outlines every manual step required for a successful cloud deployment.

### Step 1 — Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, region (us-east-1), and output format (json).
```

Alternatively, export environment variables:

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### Step 2 — Update Terraform Placeholders

Replace all `# TODO` placeholder values in the following files:

| File | Placeholders to Update |
| ---- | ---------------------- |
| `terraform/variables.tf` | AWS region, VPC CIDR, EKS cluster name, RDS instance class, DB credentials |
| `terraform/main.tf` | S3 backend bucket name, DynamoDB lock table name |
| `terraform/rds.tf` | Database name, master username, allocated storage |
| `terraform/eks.tf` | Node group instance types, desired/min/max capacity |

### Step 3 — Provision Infrastructure with Terraform

```bash
cd terraform/
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Step 4 — Set Up ECR Repositories & Push Images

```bash
# Create ECR repositories
aws ecr create-repository --repository-name pharmacy-backend --region us-east-1
aws ecr create-repository --repository-name pharmacy-frontend --region us-east-1

# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and push images
docker build -t <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/pharmacy-backend:latest app/backend
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/pharmacy-backend:latest

docker build -t <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/pharmacy-frontend:latest app/frontend
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/pharmacy-frontend:latest
```

### Step 5 — Configure kubectl for EKS

```bash
aws eks update-kubeconfig --name pharmacy-platform-dev --region us-east-1
kubectl get nodes   # Verify connectivity
```

### Step 6 — Install Helm Charts

```bash
# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add elastic https://helm.elastic.co
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Install Prometheus + Grafana
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Install Elasticsearch + Kibana
helm install elasticsearch elastic/elasticsearch --namespace logging --create-namespace
helm install kibana elastic/kibana --namespace logging

# Install Filebeat
helm install filebeat elastic/filebeat --namespace logging

# Install Vault
helm install vault hashicorp/vault --namespace vault --create-namespace
```

### Step 7 — Apply Kubernetes Manifests

```bash
# Update placeholder values in k8s/base/ files:
#   - k8s/base/configmap.yaml  → DB_HOST, DB_PORT, DB_NAME
#   - k8s/base/secret.yaml     → DB_USER, DB_PASSWORD, JWT_SECRET (base64-encoded)
#   - k8s/base/backend-deployment.yaml → ECR image URI

kubectl apply -k k8s/base/
```

### Step 8 — Configure Jenkins Credentials & Pipeline

1. In Jenkins, navigate to **Manage Jenkins → Credentials → System → Global credentials**.
2. Add an **AWS Credentials** entry with ID `aws-credentials`.
3. Update the ECR repository URIs and EKS cluster name in `jenkins/Jenkinsfile`.
4. Create a new **Pipeline** job pointing to `jenkins/Jenkinsfile` in your repository.

### Step 9 — Set Up DNS for Ingress

1. Retrieve the ALB DNS name:
   ```bash
   kubectl get ingress -n pharmacy-app
   ```
2. In your DNS provider (e.g., Route 53), create a **CNAME** record pointing your domain to the ALB DNS name.
3. (Optional) Configure TLS with AWS Certificate Manager (ACM) and annotate the Ingress resource.

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our branch strategy, commit conventions, code standards, and the pull request process.

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 PharmaCare Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

