output "jenkins_role_arn" {
  description = "ARN of the Jenkins CI/CD IAM role"
  value       = aws_iam_role.jenkins.arn
}

output "backend_irsa_role_arn" {
  description = "ARN of the backend pods IRSA role"
  value       = aws_iam_role.backend_irsa.arn
}

output "alb_controller_role_arn" {
  description = "ARN of the ALB controller IRSA role"
  value       = aws_iam_role.alb_controller.arn
}
