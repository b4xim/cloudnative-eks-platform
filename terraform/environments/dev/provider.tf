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
resource "aws_iam_role" "eks_cluster_role" {
  name = "${local.project_name}-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      },
    ]
  })
  tags = {
    Name        = "${local.project_name}-eks-cluster-role"
    Environment = local.environment
  }

}
resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}
resource "aws_eks_cluster" "main" {
  name     = "${local.project_name}-eks-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.35"

  vpc_config {
    subnet_ids = [
      aws_subnet.private_1.id,
      aws_subnet.private_2.id,
    ]
  }

  tags = {
    Name        = "${local.project_name}-eks-cluster"
    Environment = local.environment
  }
}
resource "aws_iam_role" "eks_node_group_role" {
  name = "${local.project_name}-eks-node-group-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })
  tags = {
    Name        = "${local.project_name}-eks-node-group-role"
    Environment = local.environment
  }
}
resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  role       = aws_iam_role.eks_node_group_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}
resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  role       = aws_iam_role.eks_node_group_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}
resource "aws_iam_role_policy_attachment" "eks_registry_policy" {
  role       = aws_iam_role.eks_node_group_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly"
}
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.project_name}-eks-node-group"
  node_role_arn   = aws_iam_role.eks_node_group_role.arn
  subnet_ids      = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 1
  }

  instance_types = ["t3.medium"]

  tags = {
    Name        = "${local.project_name}-eks-node-group"
    Environment = local.environment
  }
}
locals {
  project_name = "cloudnative-eks-dev-platform"
  environment  = "dev"
}