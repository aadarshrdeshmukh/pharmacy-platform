# ──────────────────────────────────────────────────────────────────────────────
# RDS Module – MySQL Database
# ──────────────────────────────────────────────────────────────────────────────

# ── DB Subnet Group ───────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnet"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-db-subnet"
  })
}

# ── Security Group ────────────────────────────────────────────────────────────
resource "aws_security_group" "rds" {
  name        = "${var.project}-${var.environment}-rds-sg"
  description = "Allow MySQL access from EKS nodes only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MySQL from EKS nodes"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [var.eks_node_security_group_id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-rds-sg"
  })
}

# ── RDS Instance ──────────────────────────────────────────────────────────────
resource "aws_db_instance" "main" {
  identifier = "${var.project}-${var.environment}-mysql"

  engine         = "mysql"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period   = var.backup_retention_period
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"

  multi_az            = true
  publicly_accessible = false
  skip_final_snapshot = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment == "dev" ? null : "${var.project}-${var.environment}-final-snapshot"

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-mysql"
  })
}
