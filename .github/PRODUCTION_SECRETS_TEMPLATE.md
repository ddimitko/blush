# 🔐 Production Secrets Template

This template provides the exact format and values needed for production deployment.

## 📋 Required GitHub Repository Secrets

Copy these commands and replace the placeholder values with your actual production credentials:

### 🗄️ Database Configuration
```bash
# PostgreSQL Production Database
gh secret set DATABASE_URL --body "jdbc:postgresql://your-production-db-host:5432/lunara_prod"
gh secret set DATABASE_USERNAME --body "lunara_user"
gh secret set DATABASE_PASSWORD --body "$(openssl rand -base64 32)"
```

### 🔴 Redis Configuration
```bash
# Redis Cache Server
gh secret set REDIS_HOST --body "your-redis-host.com"
gh secret set REDIS_PORT --body "6379"
gh secret set REDIS_PASSWORD --body "$(openssl rand -base64 24)"
```

### 🔑 JWT Security
```bash
# JWT Token Security
gh secret set JWT_SECRET --body "$(openssl rand -base64 64)"
```

### 💳 Stripe Payment Processing
```bash
# Stripe Live Keys (CRITICAL: Use live keys for production)
gh secret set STRIPE_SECRET_KEY --body "sk_live_YOUR_LIVE_SECRET_KEY_HERE"
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_YOUR_WEBHOOK_SECRET_HERE"
```

### 📧 Email Configuration
```bash
# SMTP Email Service
gh secret set MAIL_HOST --body "smtp.your-email-provider.com"
gh secret set MAIL_PORT --body "587"
gh secret set MAIL_USERNAME --body "your-email@yourdomain.com"
gh secret set MAIL_PASSWORD --body "your-email-app-password"
```

### 🔐 OAuth2 Social Login
```bash
# Facebook OAuth (Production App)
gh secret set FACEBOOK_CLIENT_ID --body "your-production-facebook-app-id"
gh secret set FACEBOOK_CLIENT_SECRET --body "your-production-facebook-app-secret"

# Google OAuth (Production App)
gh secret set GOOGLE_CLIENT_ID --body "your-production-google-client-id.apps.googleusercontent.com"
gh secret set GOOGLE_CLIENT_SECRET --body "your-production-google-client-secret"
```

### 🐰 RabbitMQ Message Queue
```bash
# RabbitMQ Server
gh secret set RABBITMQ_HOST --body "your-rabbitmq-host.com"
gh secret set RABBITMQ_PORT --body "5672"
gh secret set RABBITMQ_USERNAME --body "lunara_user"
gh secret set RABBITMQ_PASSWORD --body "$(openssl rand -base64 24)"
```

### 🚀 Deployment Configuration
```bash
# Production Server Access
gh secret set DEPLOY_HOST --body "your-production-server.com"
gh secret set DEPLOY_USER --body "deploy"
gh secret set DEPLOY_PORT --body "22"

# SSH Private Key for Deployment (Generate with: ssh-keygen -t ed25519 -C "github-actions")
gh secret set DEPLOY_SSH_KEY --body "-----BEGIN OPENSSH PRIVATE KEY-----
YOUR_PRIVATE_SSH_KEY_CONTENT_HERE
-----END OPENSSH PRIVATE KEY-----"
```

### 🔒 SSL/TLS Configuration
```bash
# SSL Certificate Keystore
gh secret set SERVER_SSL_KEY_STORE_PASSWORD --body "$(openssl rand -base64 16)"
```

### 📱 iOS App Store Configuration
```bash
# iOS Code Signing (Base64 encode your .p12 certificate)
gh secret set BUILD_CERTIFICATE_BASE64 --body "$(base64 -i YourDistributionCertificate.p12)"
gh secret set P12_PASSWORD --body "your-certificate-password"

# iOS Provisioning Profile (Base64 encode your .mobileprovision)
gh secret set BUILD_PROVISION_PROFILE_BASE64 --body "$(base64 -i YourProvisioningProfile.mobileprovision)"

# Apple Developer Configuration
gh secret set DEVELOPMENT_TEAM_ID --body "YOUR_APPLE_TEAM_ID"
gh secret set KEYCHAIN_PASSWORD --body "$(openssl rand -base64 16)"

# App Store Connect API (Base64 encode your .p8 key)
gh secret set APP_STORE_CONNECT_API_KEY_ID --body "YOUR_API_KEY_ID"
gh secret set APP_STORE_CONNECT_ISSUER_ID --body "YOUR_ISSUER_ID"
gh secret set APP_STORE_CONNECT_API_KEY_BASE64 --body "$(base64 -i AuthKey_XXXXXXXXXX.p8)"
```

### 🔔 Notifications
```bash
# Slack Deployment Notifications
gh secret set SLACK_WEBHOOK --body "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

## 🌍 Required GitHub Environment Variables

Set these in **Settings** → **Environments** → **production**:

### Application URLs
```
APP_URL=https://lunara.com
API_URL=https://api.lunara.com
FRONTEND_URL=https://app.lunara.com
WS_BASE_URL=wss://api.lunara.com
```

### Server Configuration
```
SERVER_PORT=8443
LOG_LEVEL=INFO
DEPLOY_PATH=/opt/lunara
JWT_EXPIRATION=86400000
```

### SSL Configuration
```
SERVER_SSL_ENABLED=true
SERVER_SSL_KEY_STORE=classpath:production.p12
SERVER_SSL_KEY_STORE_TYPE=PKCS12
SERVER_SSL_KEY_ALIAS=lunara-api
```

### Security & CORS
```
CORS_ALLOWED_ORIGINS=https://lunara.com,https://app.lunara.com,https://www.lunara.com
```

### Frontend Public Variables
```
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
FACEBOOK_APP_ID=YOUR_PRODUCTION_FACEBOOK_APP_ID
GOOGLE_CLIENT_ID=YOUR_PRODUCTION_GOOGLE_CLIENT_ID
```

### Performance Settings
```
RATE_LIMIT_BOOKING_ENDPOINTS=10
RATE_LIMIT_SEARCH_ENDPOINTS=30
RATE_LIMIT_PAYMENT_ENDPOINTS=5
BOOKING_SLOT_LOCK_DURATION=600000
BOOKING_MAX_CONCURRENT_LOCKS=100
SEARCH_MAX_RESULTS=50
SEARCH_CACHE_TTL=600000
```

## 🔧 Quick Setup Script

Save this as `setup-production-secrets.sh` and run it:

```bash
#!/bin/bash
set -e

echo "🔐 Setting up Lunara production secrets..."

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Install from: https://cli.github.com/"
    exit 1
fi

# Database
echo "📊 Setting up database secrets..."
read -p "Database host: " DB_HOST
read -p "Database username: " DB_USERNAME
DB_PASSWORD=$(openssl rand -base64 32)
echo "Generated database password: $DB_PASSWORD"

gh secret set DATABASE_URL --body "jdbc:postgresql://$DB_HOST:5432/lunara_prod"
gh secret set DATABASE_USERNAME --body "$DB_USERNAME"
gh secret set DATABASE_PASSWORD --body "$DB_PASSWORD"

# Redis
echo "🔴 Setting up Redis secrets..."
read -p "Redis host: " REDIS_HOST
REDIS_PASSWORD=$(openssl rand -base64 24)
echo "Generated Redis password: $REDIS_PASSWORD"

gh secret set REDIS_HOST --body "$REDIS_HOST"
gh secret set REDIS_PASSWORD --body "$REDIS_PASSWORD"

# JWT
echo "🔑 Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 64)
gh secret set JWT_SECRET --body "$JWT_SECRET"

# Stripe
echo "💳 Setting up Stripe secrets..."
read -p "Stripe live secret key (sk_live_...): " STRIPE_SECRET
read -p "Stripe webhook secret (whsec_...): " STRIPE_WEBHOOK

gh secret set STRIPE_SECRET_KEY --body "$STRIPE_SECRET"
gh secret set STRIPE_WEBHOOK_SECRET --body "$STRIPE_WEBHOOK"

echo "✅ Basic secrets configured! Continue with the manual setup for remaining secrets."
```

## ⚠️ Security Checklist

Before going to production:

- [ ] All test/development keys replaced with production keys
- [ ] Strong passwords generated for all services
- [ ] SSL certificates from trusted CA configured
- [ ] Database connections encrypted
- [ ] Redis password authentication enabled
- [ ] Webhook signature validation configured
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured appropriately
- [ ] Monitoring and alerting set up
- [ ] Backup and disaster recovery plan in place

## 🔗 Next Steps

1. Run the setup script: `.github/setup-secrets.sh`
2. Configure environment variables in GitHub
3. Test deployment to staging environment first
4. Deploy to production
5. Monitor logs and metrics
6. Set up automated backups