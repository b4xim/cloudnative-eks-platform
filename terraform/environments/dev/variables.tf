variable "vpc_cidr" {
  default     = "10.0.0.0/16"
  description = "The CIDR block for the VPC."
}
variable "public_subnet_cidr_1" {
  default     = "10.0.1.0/24"
  description = "The CIDR block for the first public subnet."
}

variable "public_subnet_cidr_2" {
  default     = "10.0.2.0/24"
  description = "The CIDR block for the second public subnet."
}
variable "private_subnet_cidr_1" {
  default     = "10.0.3.0/24"
  description = "The CIDR block for the first private subnet."
}
variable "private_subnet_cidr_2" {
  default     = "10.0.4.0/24"
  description = "The CIDR block for the second private subnet."
}
variable "availability_zone_1" {
  default     = "us-east-1a"
  description = "The first availability zone."
}
variable "availability_zone_2" {
  default     = "us-east-1b"
  description = "The second availability zone."
}