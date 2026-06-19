# ──────────────────────────────────────────────────────────────────────────────
# IAM Module – Jenkins, IRSA Backend, ALB Controller Roles
# ──────────────────────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── Jenkins CI/CD Role ────────────────────────────────────────────────────────
resource "aws_iam_role" "jenkins" {
  name = "${var.project}-${var.environment}-jenkins-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-jenkins-role"
  })
}

resource "aws_iam_policy" "jenkins" {
  name        = "${var.project}-${var.environment}-jenkins-policy"
  description = "Permissions for Jenkins CI/CD pipeline"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAccess"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Sid    = "EKSAccess"
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters"
        ]
        Resource = "arn:aws:eks:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:cluster/${var.project}-${var.environment}"
      },
      {
        Sid    = "S3ArtifactAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project}-${var.environment}-*",
          "arn:aws:s3:::${var.project}-${var.environment}-*/*"
        ]
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "jenkins" {
  policy_arn = aws_iam_policy.jenkins.arn
  role       = aws_iam_role.jenkins.name
}

# ── IRSA Role for Backend Pods ────────────────────────────────────────────────
resource "aws_iam_role" "backend_irsa" {
  name = "${var.project}-${var.environment}-backend-irsa"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${var.oidc_provider_url}:sub" = "system:serviceaccount:${var.environment}:pharmacy-backend"
          "${var.oidc_provider_url}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-backend-irsa"
  })
}

resource "aws_iam_policy" "backend_irsa" {
  name        = "${var.project}-${var.environment}-backend-policy"
  description = "Permissions for backend pods via IRSA"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3BackupAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project}-${var.environment}-backups",
          "arn:aws:s3:::${var.project}-${var.environment}-backups/*"
        ]
      },
      {
        Sid    = "SecretsManagerAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/*"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "backend_irsa" {
  policy_arn = aws_iam_policy.backend_irsa.arn
  role       = aws_iam_role.backend_irsa.name
}

# ── IRSA Role for AWS Load Balancer Controller ────────────────────────────────
resource "aws_iam_role" "alb_controller" {
  name = "${var.project}-${var.environment}-alb-controller-irsa"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${var.oidc_provider_url}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
          "${var.oidc_provider_url}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-alb-controller"
  })
}

resource "aws_iam_policy" "alb_controller" {
  name        = "${var.project}-${var.environment}-alb-controller-policy"
  description = "IAM policy for AWS Load Balancer Controller"

  # NOTE: For production, download the official full policy from:
  # https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ALBControllerPermissions"
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:*",
          "ec2:Describe*",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:CreateSecurityGroup",
          "ec2:DeleteSecurityGroup",
          "ec2:CreateTags",
          "ec2:DeleteTags",
          "iam:CreateServiceLinkedRole",
          "cognito-idp:DescribeUserPoolClient",
          "acm:ListCertificates",
          "acm:DescribeCertificate",
          "waf-regional:*",
          "wafv2:*",
          "shield:*",
          "tag:GetResources",
          "tag:TagResources"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "alb_controller" {
  policy_arn = aws_iam_policy.alb_controller.arn
  role       = aws_iam_role.alb_controller.name
}
