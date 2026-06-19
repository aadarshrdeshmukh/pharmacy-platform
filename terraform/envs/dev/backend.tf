# ──────────────────────────────────────────────────────────────────────────────
# Terraform Backend Configuration – S3 + DynamoDB
# ──────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment for AWS deployment:
  # backend "s3" {
  #   bucket         = "pharmacy-platform-dev-terraform-state" # TODO: replace with your value
  #   key            = "dev/terraform.tfstate"
  #   region         = "us-east-1"                             # TODO: replace with your value
  #   dynamodb_table = "pharmacy-platform-terraform-locks"     # TODO: replace with your value
  #   encrypt        = true
  # }
}
