# ──────────────────────────────────────────────────────────────────────────────
# CloudWatch Module – Input Variables
# ──────────────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
}

variable "eks_cluster_name" {
  description = "Name of the EKS cluster to monitor"
  type        = string
}

variable "rds_instance_id" {
  description = "RDS instance identifier to monitor"
  type        = string
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
