# ──────────────────────────────────────────────────────────────────────────────
# CloudWatch Module – Outputs
# ──────────────────────────────────────────────────────────────────────────────

output "log_group_arns" {
  description = "ARNs of the CloudWatch Log Groups"
  value = {
    eks_cluster = aws_cloudwatch_log_group.eks_cluster.arn
    application = aws_cloudwatch_log_group.application.arn
  }
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alarm notifications"
  value       = aws_sns_topic.pharmacy_alerts.arn
}

output "dashboard_arn" {
  description = "ARN of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.pharmacy_overview.dashboard_arn
}
