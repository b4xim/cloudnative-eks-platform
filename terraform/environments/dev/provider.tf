terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = {
    Name        = local.project_name
    Environment = local.environment
  }
}
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name        = "${local.project_name}-igw"
    Environment = local.environment
  }
}
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = {
    Name        = "${local.project_name}-public"
    Environment = local.environment

  }
}
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr_1
  availability_zone       = var.availability_zone_1
  map_public_ip_on_launch = true
  tags = {
    Name                     = "${local.project_name}-public-1"
    Environment              = local.environment
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr_2
  availability_zone       = var.availability_zone_2
  map_public_ip_on_launch = true
  tags = {
    Name                     = "${local.project_name}-public-2"
    Environment              = local.environment
    "kubernetes.io/role/elb" = "1"
  }
}
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr_1
  availability_zone = var.availability_zone_1
  tags = {
    Name                              = "${local.project_name}-private-1"
    Environment                       = local.environment
    "kubernetes.io/role/internal-elb" = "1"
  }
}
resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr_2
  availability_zone = var.availability_zone_2
  tags = {
    Name                              = "${local.project_name}-private-2"
    Environment                       = local.environment
    "kubernetes.io/role/internal-elb" = "1"
  }
}
resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}
resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}
resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private_1.id
}
resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private_2.id
}
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1.id
  tags = {
    Name        = "${local.project_name}-nat"
    Environment = local.environment
  }

}
resource "aws_nat_gateway" "main_2" {
  allocation_id = aws_eip.nat_2.id
  subnet_id     = aws_subnet.public_2.id
  tags = {
    Name        = "${local.project_name}-nat-2"
    Environment = local.environment
  }
}
resource "aws_eip" "nat" {
  tags = {
    Name        = "${local.project_name}-nat-eip"
    Environment = local.environment
  }
}
resource "aws_eip" "nat_2" {
  tags = {
    Name        = "${local.project_name}-nat-eip-2"
    Environment = local.environment
  }
}
resource "aws_route_table" "private_1" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name        = "${local.project_name}-private-1"
    Environment = local.environment
  }
}
resource "aws_route_table" "private_2" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name        = "${local.project_name}-private-2"
    Environment = local.environment
  }
}
resource "aws_route" "private_1" {
  route_table_id         = aws_route_table.private_1.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id

}
resource "aws_route" "private_2" {
  route_table_id         = aws_route_table.private_2.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main_2.id
}

locals {
  project_name = "cloudnative-eks-dev-platform"
  environment  = "dev"
}