# ──────────────────────────────────────────────────────────────────────────────
# S3 Module – State Bucket & Backups Bucket
# ──────────────────────────────────────────────────────────────────────────────

# ── Terraform State Bucket ────────────────────────────────────────────────────
resource "aws_s3_bucket" "state" {
  bucket = "${var.project}-${var.environment}-terraform-state"

  tags = merge(var.common_tags, {
    Name    = "${var.project}-${var.environment}-terraform-state"
    Purpose = "Terraform remote state"
  })
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── Backups Bucket ────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "backups" {
  bucket = "${var.project}-${var.environment}-backups"

  tags = merge(var.common_tags, {
    Name    = "${var.project}-${var.environment}-backups"
    Purpose = "Database and application backups"
  })
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "backup-lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
