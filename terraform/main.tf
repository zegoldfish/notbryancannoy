terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Security group for EC2
resource "aws_security_group" "web_sg" {
  name        = "notbryancannoy-web-sg"
  description = "Security group for web server"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Change this to your IP for better security
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# IAM role for EC2 to access ECR
resource "aws_iam_role" "ec2_ecr_role" {
  name = "notbryancannoy-ec2-ecr-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  role       = aws_iam_role.ec2_ecr_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "notbryancannoy-ec2-profile"
  role = aws_iam_role.ec2_ecr_role.name
}

# EC2 instance
resource "aws_instance" "web" {
  ami           = "ami-0453ec754f44f9a4a" # Amazon Linux 2023 in us-east-1
  instance_type = "t3.micro"
  key_name      = "notbryancannoy-key" # Add your key pair name

  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install docker -y
              service docker start
              usermod -a -G docker ec2-user
              
              # Login to ECR and pull the image
              aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 965534507674.dkr.ecr.us-east-1.amazonaws.com
              docker pull 965534507674.dkr.ecr.us-east-1.amazonaws.com/notbryancannoy:latest
              docker run -d -p 80:3000 --restart unless-stopped 965534507674.dkr.ecr.us-east-1.amazonaws.com/notbryancannoy:latest
              EOF

  tags = {
    Name = "notbryancannoy-web"
  }
}

output "instance_public_ip" {
  value = aws_instance.web.public_ip
}

output "instance_id" {
  value = aws_instance.web.id
}
