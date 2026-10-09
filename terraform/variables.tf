variable "aws_region" {
  description = "Región de AWS donde desplegar los recursos"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Entorno de despliegue (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "dynamodb_table_name" {
  description = "Nombre de la tabla DynamoDB para las reservas"
  type        = string
  default     = "ParkAdventure"
}

variable "sns_topic_name" {
  description = "Nombre del tema SNS para las alertas y notificaciones del equipo"
  type        = string
  default     = "ParkAdventureTeam"
}

variable "s3_bucket_prefix" {
  description = "Prefijo para el bucket S3 de alojamiento del sitio estático"
  type        = string
  default     = "park-adventure-web"
}

variable "notification_email" {
  description = "Correo electrónico opcional para suscribirse a las notificaciones SNS"
  type        = string
  default     = ""
}
