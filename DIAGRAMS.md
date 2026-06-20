# Pharmacy Platform — Architecture & Deployment Diagrams

## 1. System Architecture Diagram

```mermaid
graph TB
    subgraph Client["🌐 Client Layer"]
        Browser["Browser / Mobile"]
    end

    subgraph Frontend["📱 Frontend Layer"]
        React["React.js SPA<br/>Port 3000"]
        Nginx["Nginx Reverse Proxy<br/>Port 80"]
    end

    subgraph Backend["⚙️ Backend Layer"]
        Express["Node.js + Express API<br/>Port 3001"]
        Auth["JWT Authentication<br/>Middleware"]
        Metrics["Prometheus Metrics<br/>/metrics endpoint"]
    end

    subgraph Database["🗄️ Database Layer"]
        MySQL[("MySQL 8.0<br/>Port 3306")]
    end

    subgraph Monitoring["📊 Monitoring Stack"]
        Prometheus["Prometheus<br/>Port 9090"]
        Grafana["Grafana Dashboards<br/>Port 3002"]
    end

    subgraph Secrets["🔐 Secret Management"]
        Vault["HashiCorp Vault<br/>Port 8200"]
    end

    subgraph CICD["🚀 CI/CD Pipeline"]
        GitHub["GitHub Repository"]
        GHA["GitHub Actions"]
        Jenkins["Jenkins Server<br/>Port 8080"]
    end

    subgraph AWS["☁️ AWS Cloud"]
        ECR["ECR Container Registry"]
        EKS["EKS Kubernetes Cluster"]
        RDS[("RDS PostgreSQL")]
        S3["S3 Buckets"]
        CW["CloudWatch Logs & Alarms"]
    end

    Browser -->|HTTPS| Nginx
    Nginx -->|HTTP| React
    React -->|REST API| Express
    Express -->|SQL Queries| MySQL
    Express -->|JWT| Auth
    Express -->|Expose| Metrics
    Prometheus -->|Scrape /metrics| Metrics
    Prometheus -->|Data Source| Grafana
    Vault -->|Inject Secrets| Express
    GitHub -->|Webhook| GHA
    GitHub -->|Webhook| Jenkins
    GHA -->|Build & Push| ECR
    GHA -->|Deploy| EKS
    Jenkins -->|Build & Push| ECR
    EKS -->|Connect| RDS
    EKS -->|Logs| CW
    S3 -->|Terraform State| AWS

    style Client fill:#E3F2FD,stroke:#1565C0,color:#000
    style Frontend fill:#E8F5E9,stroke:#2E7D32,color:#000
    style Backend fill:#FFF3E0,stroke:#E65100,color:#000
    style Database fill:#FCE4EC,stroke:#C62828,color:#000
    style Monitoring fill:#F3E5F5,stroke:#6A1B9A,color:#000
    style Secrets fill:#FFF8E1,stroke:#F57F17,color:#000
    style CICD fill:#E0F7FA,stroke:#00695C,color:#000
    style AWS fill:#FFF9C4,stroke:#F57F17,color:#000
```

---

## 2. Deployment Diagram — Local (Docker Compose)

```mermaid
graph LR
    subgraph DockerCompose["🐳 Docker Compose - Local Development"]
        subgraph AppServices["Application Services"]
            FE["pharmacy-frontend<br/>Nginx:80 → :3000"]
            BE["pharmacy-backend<br/>Express → :3001"]
            DB[("pharmacy-mysql<br/>MySQL 8.0 → :3307")]
        end

        subgraph MonitoringServices["Monitoring Services"]
            PROM["pharmacy-prometheus<br/>Prometheus → :9090"]
            GRAF["pharmacy-grafana<br/>Grafana → :3002"]
        end

        subgraph CICDServices["CI/CD Services"]
            JENK["pharmacy-jenkins<br/>Jenkins → :8080"]
        end
    end

    FE -->|"HTTP :3001"| BE
    BE -->|"TCP :3306"| DB
    PROM -->|"Scrape :3001/metrics"| BE
    GRAF -->|"Query :9090"| PROM

    style DockerCompose fill:#E3F2FD,stroke:#1565C0,color:#000
    style AppServices fill:#E8F5E9,stroke:#2E7D32,color:#000
    style MonitoringServices fill:#F3E5F5,stroke:#6A1B9A,color:#000
    style CICDServices fill:#FFF3E0,stroke:#E65100,color:#000
```

---

## 3. Deployment Diagram — AWS (Production)

```mermaid
graph TB
    subgraph AWS["☁️ AWS Cloud - us-east-1"]
        subgraph VPC["VPC 10.0.0.0/16"]
            IGW["Internet Gateway"]

            subgraph PublicSubnets["Public Subnets"]
                PUB1["10.0.1.0/24<br/>us-east-1a"]
                PUB2["10.0.2.0/24<br/>us-east-1b"]
                NAT["NAT Gateway"]
            end

            subgraph PrivateSubnets["Private Subnets"]
                PRIV1["10.0.3.0/24<br/>us-east-1a"]
                PRIV2["10.0.4.0/24<br/>us-east-1b"]

                subgraph EKS["EKS Cluster - pharmacy-platform-dev"]
                    NODE1["Node 1<br/>t3.micro"]
                    NODE2["Node 2<br/>t3.micro"]
                    NODE3["Node 3<br/>t3.micro"]

                    subgraph Pods["Kubernetes Pods"]
                        FE_POD["Frontend Pod"]
                        BE_POD["Backend Pod"]
                        PROM_POD["Prometheus"]
                        VAULT_POD["Vault"]
                    end
                end

                RDS[("RDS PostgreSQL<br/>db.t3.micro<br/>Port 5432")]
            end
        end

        ECR["ECR Registry<br/>Backend + Frontend Images"]
        S3_STATE["S3 - Terraform State<br/>Versioning Enabled"]
        S3_BACKUP["S3 - Backups<br/>Lifecycle: IA→Glacier"]
        CW["CloudWatch<br/>Logs + CPU/Storage Alarms"]
        SNS["SNS Topic<br/>Alert Notifications"]
    end

    subgraph CICD["CI/CD"]
        GHA["GitHub Actions"]
        TF["Terraform"]
    end

    Internet["🌐 Internet"] -->|HTTPS| IGW
    IGW --> PUB1
    IGW --> PUB2
    NAT --> PRIV1
    NAT --> PRIV2
    BE_POD -->|TCP :5432| RDS
    GHA -->|Push Images| ECR
    GHA -->|Deploy| EKS
    TF -->|Manage| AWS
    EKS -->|Logs| CW
    CW -->|Alerts| SNS
    ECR -->|Pull Images| EKS

    style AWS fill:#FFF9C4,stroke:#F57F17,color:#000
    style VPC fill:#E3F2FD,stroke:#1565C0,color:#000
    style PublicSubnets fill:#E8F5E9,stroke:#2E7D32,color:#000
    style PrivateSubnets fill:#FCE4EC,stroke:#C62828,color:#000
    style EKS fill:#E0F7FA,stroke:#00695C,color:#000
    style Pods fill:#F3E5F5,stroke:#6A1B9A,color:#000
    style CICD fill:#FFF3E0,stroke:#E65100,color:#000
```

---

## 4. CI/CD Pipeline Flow

```mermaid
graph LR
    subgraph Trigger["Trigger"]
        PUSH["Git Push to main"]
    end

    subgraph CI["CI — Lint & Test"]
        LINT_BE["Backend Lint"]
        TEST_BE["Backend Unit Tests<br/>Jest - 10 tests"]
        LINT_FE["Frontend Lint"]
        TEST_FE["Frontend Tests"]
        DOCKER_V["Docker Build<br/>Verification"]
    end

    subgraph CD["CD — Release & Deploy"]
        BUILD["Build Docker Images"]
        PUSH_ECR["Push to AWS ECR"]
        DEPLOY["Deploy to EKS"]
        VERIFY["Verify Deployment"]
    end

    PUSH --> LINT_BE
    PUSH --> LINT_FE
    LINT_BE --> TEST_BE
    LINT_FE --> TEST_FE
    PUSH --> DOCKER_V
    PUSH --> BUILD
    BUILD --> PUSH_ECR
    PUSH_ECR --> DEPLOY
    DEPLOY --> VERIFY

    style Trigger fill:#E8F5E9,stroke:#2E7D32,color:#000
    style CI fill:#E3F2FD,stroke:#1565C0,color:#000
    style CD fill:#FFF3E0,stroke:#E65100,color:#000
```

---

## How to View These Diagrams

These are **Mermaid diagrams**. To render them:

1. **GitHub** — Push this file to your repo. GitHub renders Mermaid natively in markdown.
2. **VS Code** — Install the "Markdown Preview Mermaid Support" extension.
3. **Online** — Paste the mermaid code blocks at https://mermaid.live
