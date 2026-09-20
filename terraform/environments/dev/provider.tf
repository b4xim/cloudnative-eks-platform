terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
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

  instance_types = ["t3.small"]

  tags = {
    Name        = "${local.project_name}-eks-node-group"
    Environment = local.environment
  }
}

resource "aws_iam_policy" "aws_load_balancer_controller_policy" {
  name        = "${local.project_name}-aws-load-balancer-controller-policy"
  description = "Policy for AWS Load Balancer Controller"
  policy      = file("${path.module}/iam_policy.json")
  tags = {
    Name        = "${local.project_name}-aws-load-balancer-controller-policy"
    Environment = local.environment
  }
}

resource "aws_iam_role" "aws_load_balancer_controller_role" {
  name = "${local.project_name}-aws-load-balancer-controller-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sts:AssumeRole",
          "sts:TagSession"
        ]
        Effect = "Allow"
        Principal = {
          Service = "pods.eks.amazonaws.com"
        }
      },
    ]
  })
  tags = {
    Name        = "${local.project_name}-aws-load-balancer-controller-role"
    Environment = local.environment
  }
}
resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller_policy_attachment" {
  role       = aws_iam_role.aws_load_balancer_controller_role.name
  policy_arn = aws_iam_policy.aws_load_balancer_controller_policy.arn
}
resource "aws_eks_addon" "pod_identity_agent" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "eks-pod-identity-agent"
}
resource "aws_eks_pod_identity_association" "aws_load_balancer_controller" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = "kube-system"
  service_account = "aws-load-balancer-controller"
  role_arn        = aws_iam_role.aws_load_balancer_controller_role.arn
}
resource "aws_ecr_repository" "main" {
  name = "${local.project_name}-ecr-repo"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    Name        = "${local.project_name}-ecr-repo"
    Environment = local.environment
  }
}
resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.main.name
  policy     = file("${path.module}/ecr_lifecycle_policy.json")
}
resource "aws_rds_cluster" "main" {
  cluster_identifier        = "${local.project_name}-rds-cluster"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  master_username           = "admin"
  master_password           = random_password.rds_master_password.result
  skip_final_snapshot       = true
  backup_retention_period   = 7
  vpc_security_group_ids    = [aws_security_group.rds.id]
  db_subnet_group_name      = aws_db_subnet_group.main.name
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name
  tags = {
    Name        = "${local.project_name}-rds-cluster"
    Environment = local.environment
  }
}
resource "aws_db_subnet_group" "main" {
  name       = "${local.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  tags = {
    Name        = "${local.project_name}-db-subnet-group"
    Environment = local.environment
  }
}
resource "random_password" "rds_master_password" {
  length           = 32
  special          = true
  }

resource "aws_rds_cluster_instance" "main" {
  count              = 2
  identifier         = "${local.project_name}-rds-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.t3.small"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version
  publicly_accessible = false
  tags = {
    Name        = "${local.project_name}-rds-instance-${count.index + 1}"
    Environment = local.environment
  }
}

resource "aws_rds_cluster_parameter_group" "main" {
  name        = "${local.project_name}-rds-cluster-parameter-group"
  family      = "aurora-postgresql15"
  description = "Custom parameter group for Aurora PostgreSQL"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name        = "${local.project_name}-rds-cluster-parameter-group"
    Environment = local.environment
  }
}


resource "aws_security_group" "rds" {
  name        = "${local.project_name}-rds-sg"
  description = "Security group for RDS cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }
}
output "ecr_repository_url" {
  value = aws_ecr_repository.main.repository_url
}
locals {
  project_name = "cloudnative-eks-dev-platform"
  environment  = "dev"
}