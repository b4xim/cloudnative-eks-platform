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
    Name = local.project_name
    Environment = local.environment
  }
}
resource "aws_subnet" "public_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidr_1
  availability_zone = var.availability_zone_1
  map_public_ip_on_launch = true
  tags = {
    Name = "${local.project_name}-public-1"
    Environment = local.environment
  }
}
resource "aws_subnet" "public_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidr_2
  availability_zone = var.availability_zone_2
  map_public_ip_on_launch = true
  tags = {
    Name = "${local.project_name}-public-2"
    Environment = local.environment
  }
}
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr_1
  availability_zone = var.availability_zone_1
  tags = {
    Name = "${local.project_name}-private-1"
    Environment = local.environment
  }
}
resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr_2
  availability_zone = var.availability_zone_2 
  tags = {
    Name = "${local.project_name}-private-2"
    Environment = local.environment
  }
}

locals {
  project_name = "cloudnative-eks-dev-platform"
  environment  = "dev"
}