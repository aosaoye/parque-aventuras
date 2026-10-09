# ==============================================================================
# 1. BUCKET S3 PARA ALOJAMIENTO DEL SITIO ESTÁTICO (WEB)
# ==============================================================================

resource "aws_s3_bucket" "website" {
  bucket_prefix = "${var.s3_bucket_prefix}-${var.environment}-"
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "website" {
  bucket = aws_s3_bucket.website.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_policy" "public_read" {
  depends_on = [aws_s3_bucket_public_access_block.website]
  bucket     = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}

# Subida automática de los archivos estáticos al bucket S3
locals {
  site_files = {
    "index.html"        = { path = "${path.module}/../index.html", content_type = "text/html; charset=utf-8" }
    "css/styles.css"    = { path = "${path.module}/../css/styles.css", content_type = "text/css; charset=utf-8" }
    "js/app.js"         = { path = "${path.module}/../js/app.js", content_type = "application/javascript; charset=utf-8" }
    "js/three-scene.js" = { path = "${path.module}/../js/three-scene.js", content_type = "application/javascript; charset=utf-8" }
  }
}

resource "aws_s3_object" "site_assets" {
  for_each = local.local_files_exist ? local.site_files : {}

  bucket       = aws_s3_bucket.website.id
  key          = each.key
  source       = each.value.path
  content_type = each.value.content_type
  etag         = filemd5(each.value.path)
}

locals {
  local_files_exist = fileexists("${path.module}/../index.html")
}


# ==============================================================================
# 2. DYNAMODB TABLE (ParkAdventure)
# ==============================================================================

resource "aws_dynamodb_table" "park_adventure" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = var.dynamodb_table_name
  }
}


# ==============================================================================
# 3. SNS TOPIC (ParkAdventureTeam)
# ==============================================================================

resource "aws_sns_topic" "park_adventure_team" {
  name = var.sns_topic_name

  tags = {
    Name = var.sns_topic_name
  }
}

# Suscripción de email opcional para recibir notificaciones
resource "aws_sns_topic_subscription" "email_sub" {
  count     = var.notification_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.park_adventure_team.arn
  protocol  = "email"
  endpoint  = var.notification_email
}


# ==============================================================================
# 4. AWS LAMBDA FUNCTION & ROLES IAM
# ==============================================================================

# Empaquetado automático del archivo index.mjs en ZIP
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambda/index.mjs"
  output_path = "${path.module}/lambda.zip"
}

# Rol de IAM para la ejecución del Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "park-adventure-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Política con permisos para CloudWatch Logs, DynamoDB PutItem y SNS Publish
resource "aws_iam_policy" "lambda_policy" {
  name        = "park-adventure-lambda-policy-${var.environment}"
  description = "Permisos necesarios para guardar en DynamoDB y publicar en SNS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.park_adventure.arn,
          "${aws_dynamodb_table.park_adventure.arn}/*"
        ]
      },
      {
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.park_adventure_team.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# Función Lambda
resource "aws_lambda_function" "subscriptions" {
  function_name    = "park-adventure-subscriptions-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME    = aws_dynamodb_table.park_adventure.name
      SNS_TOPIC_ARN = aws_sns_topic.park_adventure_team.arn
      AWS_REGION    = var.aws_region
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_attach
  ]
}


# ==============================================================================
# 5. API GATEWAY (HTTP API v2)
# ==============================================================================

resource "aws_apigatewayv2_api" "http_api" {
  name          = "park-adventure-api-${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.subscriptions.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Ruta solicitada por el usuario: /subcriptions
resource "aws_apigatewayv2_route" "subcriptions_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /subcriptions"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# Ruta estándar /subscriptions como alias
resource "aws_apigatewayv2_route" "subscriptions_alias_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /subscriptions"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = var.environment
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gw_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.subscriptions.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
