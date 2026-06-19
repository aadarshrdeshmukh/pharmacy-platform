output "endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "port" {
  description = "Port number for the RDS instance"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Name of the default database"
  value       = aws_db_instance.main.db_name
}
