output "s3_website_bucket_name" {
  description = "Nombre del bucket S3 para el sitio web estático"
  value       = aws_s3_bucket.website.id
}

output "s3_website_endpoint" {
  description = "URL pública de alojamiento estático en S3"
  value       = "http://${aws_s3_bucket_website_configuration.website.website_endpoint}"
}

output "dynamodb_table_name" {
  description = "Nombre de la tabla DynamoDB"
  value       = aws_dynamodb_table.park_adventure.name
}

output "dynamodb_table_arn" {
  description = "ARN de la tabla DynamoDB"
  value       = aws_dynamodb_table.park_adventure.arn
}

output "sns_topic_name" {
  description = "Nombre del tema SNS para el equipo"
  value       = aws_sns_topic.park_adventure_team.name
}

output "sns_topic_arn" {
  description = "ARN del tema SNS para ParkAdventureTeam"
  value       = aws_sns_topic.park_adventure_team.arn
}

output "lambda_function_name" {
  description = "Nombre de la función Lambda"
  value       = aws_lambda_function.subscriptions.function_name
}

output "lambda_function_arn" {
  description = "ARN de la función Lambda"
  value       = aws_lambda_function.subscriptions.arn
}

output "api_gateway_url" {
  description = "URL base de API Gateway"
  value       = aws_apigatewayv2_stage.stage.invoke_url
}

output "api_subscriptions_endpoint" {
  description = "URL completa para POST de reservas"
  value       = "${aws_apigatewayv2_stage.stage.invoke_url}/subcriptions"
}
