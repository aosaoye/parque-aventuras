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
  local_files_exist = fileexists("${path.module}/../index.html")
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


# ==============================================================================
# 2. REFERENCIAS A RECURSOS EXISTENTES (DYNAMODB, SNS, LABROLE)
# ==============================================================================

data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

data "aws_dynamodb_table" "park_adventure" {
  name = var.dynamodb_table_name
}

data "aws_sns_topic" "park_adventure_team" {
  name = var.sns_topic_name
}
