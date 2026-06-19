# ──────────────────────────────────────────────────────────────────────────────
# Dev Environment – Outputs
# ──────────────────────────────────────────────────────────────────────────────

# ── Network ───────────────────────────────────────────────────────────────────
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.network.private_subnet_ids
}

# ── EKS ───────────────────────────────────────────────────────────────────────
output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_ca_cert" {
  description = "EKS cluster CA certificate"
  value       = module.eks.cluster_ca_cert
  sensitive   = true
}

# ── RDS ───────────────────────────────────────────────────────────────────────
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = module.rds.port
}

output "rds_db_name" {
  description = "RDS database name"
  value       = module.rds.db_name
}

# ── S3 ────────────────────────────────────────────────────────────────────────
output "state_bucket_name" {
  description = "Terraform state bucket name"
  value       = module.s3.state_bucket_name
}

output "backups_bucket_name" {
  description = "Backups bucket name"
  value       = module.s3.backups_bucket_name
}

# ── IAM ───────────────────────────────────────────────────────────────────────
output "jenkins_role_arn" {
  description = "Jenkins IAM role ARN"
  value       = module.iam.jenkins_role_arn
}

output "backend_irsa_role_arn" {
  description = "Backend IRSA role ARN"
  value       = module.iam.backend_irsa_role_arn
}

output "alb_controller_role_arn" {
  description = "ALB Controller IRSA role ARN"
  value       = module.iam.alb_controller_role_arn
}

# ── ECR ───────────────────────────────────────────────────────────────────────
output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

# ── CloudWatch ────────────────────────────────────────────────────────────────
output "cloudwatch_sns_topic_arn" {
  description = "ARN of the CloudWatch alerts SNS topic"
  value       = module.cloudwatch.sns_topic_arn
}

output "cloudwatch_log_group_arns" {
  description = "ARNs of the CloudWatch Log Groups"
  value       = module.cloudwatch.log_group_arns
}
