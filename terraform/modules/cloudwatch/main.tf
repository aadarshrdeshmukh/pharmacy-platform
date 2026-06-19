# ──────────────────────────────────────────────────────────────────────────────
# CloudWatch Module – Monitoring & Alerting for Pharmacy Platform
# ──────────────────────────────────────────────────────────────────────────────
# Creates:
#   - CloudWatch Log Groups for EKS cluster and application logs
#   - Metric Alarms for CPU, memory, and storage thresholds
#   - SNS Topic for alarm notifications
#   - CloudWatch Dashboard with key operational metrics
# ──────────────────────────────────────────────────────────────────────────────

# ── Log Groups ────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/pharmacy/eks/cluster"
  retention_in_days = 30

  tags = merge(var.tags, {
    Name      = "${var.project}-eks-logs"
    Component = "eks"
  })
}

resource "aws_cloudwatch_log_group" "application" {
  name              = "/pharmacy/application"
  retention_in_days = 30

  tags = merge(var.tags, {
    Name      = "${var.project}-app-logs"
    Component = "application"
  })
}

# ── SNS Topic for Alarm Notifications ────────────────────────────────────────

resource "aws_sns_topic" "pharmacy_alerts" {
  name = "${var.project}-${var.environment}-alerts"

  tags = merge(var.tags, {
    Name = "${var.project}-alerts"
  })
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.pharmacy_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ── EKS Metric Alarms ────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "high_cpu_utilization" {
  alarm_name          = "${var.project}-${var.environment}-HighCPUUtilization"
  alarm_description   = "EKS node group CPU utilization exceeds 80% for 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "missing"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = [aws_sns_topic.pharmacy_alerts.arn]
  ok_actions    = [aws_sns_topic.pharmacy_alerts.arn]

  tags = merge(var.tags, {
    Name = "${var.project}-high-cpu-alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "high_memory_utilization" {
  alarm_name          = "${var.project}-${var.environment}-HighMemoryUtilization"
  alarm_description   = "EKS node memory utilization exceeds 80%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "missing"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = [aws_sns_topic.pharmacy_alerts.arn]
  ok_actions    = [aws_sns_topic.pharmacy_alerts.arn]

  tags = merge(var.tags, {
    Name = "${var.project}-high-memory-alarm"
  })
}

# ── RDS Metric Alarms ────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.project}-${var.environment}-RDSHighCPU"
  alarm_description   = "RDS CPU utilization exceeds 80% for 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "missing"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.pharmacy_alerts.arn]
  ok_actions    = [aws_sns_topic.pharmacy_alerts.arn]

  tags = merge(var.tags, {
    Name = "${var.project}-rds-high-cpu-alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "${var.project}-${var.environment}-RDSLowStorage"
  alarm_description   = "RDS free storage space is below 5 GB"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5 GB in bytes
  treat_missing_data  = "missing"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.pharmacy_alerts.arn]
  ok_actions    = [aws_sns_topic.pharmacy_alerts.arn]

  tags = merge(var.tags, {
    Name = "${var.project}-rds-low-storage-alarm"
  })
}

# ── CloudWatch Dashboard ─────────────────────────────────────────────────────

resource "aws_cloudwatch_dashboard" "pharmacy_overview" {
  dashboard_name = "${var.project}-${var.environment}-overview"

  dashboard_body = jsonencode({
    widgets = [
      # ── Row 1: EKS CPU Utilization ──────────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "EKS Node CPU Utilization"
          metrics = [
            ["ContainerInsights", "node_cpu_utilization", "ClusterName", var.eks_cluster_name]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          view   = "timeSeries"
          yAxis = {
            left = {
              min   = 0
              max   = 100
              label = "Percent"
            }
          }
        }
      },
      # ── Row 1: RDS CPU Utilization ──────────────────────────────────────
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "RDS CPU Utilization"
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          view   = "timeSeries"
          yAxis = {
            left = {
              min   = 0
              max   = 100
              label = "Percent"
            }
          }
        }
      },
      # ── Row 2: RDS Database Connections ─────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "RDS Database Connections"
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          view   = "timeSeries"
        }
      },
      # ── Row 2: ALB Request Count ────────────────────────────────────────
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "ALB Request Count"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${var.project}-${var.environment}"]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          view   = "timeSeries"
        }
      }
    ]
  })
}

# ── Data Sources ──────────────────────────────────────────────────────────────

data "aws_region" "current" {}
