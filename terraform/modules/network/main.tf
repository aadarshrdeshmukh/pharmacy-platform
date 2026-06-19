# ──────────────────────────────────────────────────────────────────────────────
# Network Module – VPC, Subnets, IGW, NAT Gateway, Route Tables
# ──────────────────────────────────────────────────────────────────────────────

data "aws_availability_zones" "available" {
  state = "available"
}

# ── VPC ───────────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-vpc"
  })
}

# ── Public Subnets ────────────────────────────────────────────────────────────
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.common_tags, {
    Name                                                     = "${var.project}-${var.environment}-public-${count.index + 1}"
    "kubernetes.io/role/elb"                                  = "1"
    "kubernetes.io/cluster/${var.project}-${var.environment}" = "shared"
  })
}

# ── Private Subnets ───────────────────────────────────────────────────────────
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(var.common_tags, {
    Name                                                     = "${var.project}-${var.environment}-private-${count.index + 1}"
    "kubernetes.io/role/internal-elb"                         = "1"
    "kubernetes.io/cluster/${var.project}-${var.environment}" = "shared"
  })
}

# ── Internet Gateway ──────────────────────────────────────────────────────────
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-igw"
  })
}

# ── Elastic IP for NAT Gateway 1 ──────────────────────────────────────────────
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-nat-eip-1"
  })
}

# ── NAT Gateway 1 (first public subnet) ──────────────────────────────────────
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-nat-1"
  })

  depends_on = [aws_internet_gateway.main]
}

# ── Elastic IP for NAT Gateway 2 ──────────────────────────────────────────────
resource "aws_eip" "nat_2" {
  domain = "vpc"

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-nat-eip-2"
  })
}

# ── NAT Gateway 2 (second public subnet) ─────────────────────────────────────
resource "aws_nat_gateway" "secondary" {
  allocation_id = aws_eip.nat_2.id
  subnet_id     = aws_subnet.public[1].id

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-nat-2"
  })

  depends_on = [aws_internet_gateway.main]
}

# ── Public Route Table ────────────────────────────────────────────────────────
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ── Private Route Table 1 (AZ-1, uses NAT Gateway 1) ────────────────────────
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-private-rt-1"
  })
}

resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private[0].id
  route_table_id = aws_route_table.private.id
}

# ── Private Route Table 2 (AZ-2, uses NAT Gateway 2) ────────────────────────
resource "aws_route_table" "private_2" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.secondary.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-private-rt-2"
  })
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private[1].id
  route_table_id = aws_route_table.private_2.id
}
