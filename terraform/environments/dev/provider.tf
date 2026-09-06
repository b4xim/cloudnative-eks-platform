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

locals {
  project_name = "cloudnative-eks-platform"
  environment  = "dev"
}