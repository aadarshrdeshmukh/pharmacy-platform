# ──────────────────────────────────────────────────────────────────────────────
# Dev Environment – Root Configuration
# ──────────────────────────────────────────────────────────────────────────────

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── Network ───────────────────────────────────────────────────────────────────
module "network" {
  source = "../../modules/network"

  project     = var.project
  environment = var.environment
  common_tags = local.common_tags
}

# ── EKS Cluster ───────────────────────────────────────────────────────────────
module "eks" {
  source = "../../modules/eks"

  project            = var.project
  environment        = var.environment
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids
  common_tags        = local.common_tags
}

# ── RDS PostgreSQL ────────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  project                    = var.project
  environment                = var.environment
  vpc_id                     = module.network.vpc_id
  private_subnet_ids         = module.network.private_subnet_ids
  eks_node_security_group_id = module.eks.node_security_group_id
  db_password                = var.db_password
  common_tags                = local.common_tags
}

# ── S3 Buckets ────────────────────────────────────────────────────────────────
module "s3" {
  source = "../../modules/s3"

  project     = var.project
  environment = var.environment
  common_tags = local.common_tags
}

# ── IAM Roles ─────────────────────────────────────────────────────────────────
module "iam" {
  source = "../../modules/iam"

  project           = var.project
  environment       = var.environment
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  common_tags       = local.common_tags
}

# ── ECR Repositories ──────────────────────────────────────────────────────────
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project}/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-backend"
  })
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project}/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-frontend"
  })
}

# ── CloudWatch Monitoring ─────────────────────────────────────────────────────
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  project          = var.project
  environment      = var.environment
  eks_cluster_name = module.eks.cluster_name
  rds_instance_id  = "${var.project}-${var.environment}-mysql"   # matches aws_db_instance.main.identifier in the RDS module
  alert_email      = var.alert_email                             # TODO: set via terraform.tfvars or CI variable
  tags             = local.common_tags
}
