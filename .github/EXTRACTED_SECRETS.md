# 🔐 Extracted Secrets Configuration

This document contains all secrets extracted from your current environment files and their GitHub CI/CD configuration.

## 📋 Current Environment Analysis

### From `.env.development`:
- **Database**: PostgreSQL (localhost:5433/beautyhub)
- **JWT Secret**: `aVNZorUyFJ9TLrsR7BEOX6QN92LBpdi64ugf1Zg4NTT9kX7JlcCSRNqrOOU13j5aED8T5dATCdIKxIf9vYg`
- **Stripe**: Test keys configured
- **Redis**: localhost:6379
- **Email**: Gmail SMTP configured

### From `bhfrontend/.env`:
- **API URL**: https://109.104.206.19:8443/api
- **Stripe Publishable**: pk_test_51QtTgOE2dBEKUmD174iW0Lk9h9YazQfOrfLeACcAlYfHoFDyUww1VP4gTILNwfZC7y1cTLO0vBY5tYPHahyCuPsz008YkKGJlv
- **Facebook App ID**: 892690056358950
- **SSL Certificates**: localhost.pem/localhost-key.pem

## 🚀 GitHub Secrets Configuration

### Required Repository Secrets

```bash
# Database Configuration
DATABASE_URL=jdbc:postgresql://your-production-host:5432/lunara_prod
DATABASE_USERNAME=lunara_user
DATABASE_PASSWORD=<generate-secure-password>

# Redis Configuration  
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=<generate-secure-password>

# JWT Security
JWT_SECRET=<generate-new-secure-jwt-secret>

# Stripe Configuration (PRODUCTION KEYS NEEDED)
STRIPE_SECRET_KEY=sk_live_<your-live-secret-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-webhook-secret>

# Email Configuration
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=<your-email-password>

# OAuth2 Configuration (PRODUCTION KEYS NEEDED)
FACEBOOK_CLIENT_ID=<your-production-facebook-app-id>
FACEBOOK_CLIENT_SECRET=<your-production-facebook-secret>
GOOGLE_CLIENT_ID=<your-production-google-client-id>
GOOGLE_CLIENT_SECRET=<your-production-google-secret>

# RabbitMQ Configuration
RABBITMQ_HOST=your-rabbitmq-host
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=lunara_user
RABBITMQ_PASSWORD=<generate-secure-password>

# Deployment Configuration
DEPLOY_HOST=your-server-ip-or-domain
DEPLOY_USER=deploy
DEPLOY_SSH_KEY=<your-deployment-ssh-private-key>
DEPLOY_PORT=22

# SSL Configuration
SERVER_SSL_KEY_STORE_PASSWORD=<generate-secure-keystore-password>

# Notifications
SLACK_WEBHOOK=https://hooks.slack.com/services/your/webhook/url
```

### Environment Variables (Non-Secret)

```bash
# Production Environment Variables
APP_URL=https://your-domain.com
API_URL=https://api.your-domain.com
DEPLOY_PATH=/opt/lunara
SERVER_PORT=8443
LOG_LEVEL=INFO
JWT_EXPIRATION=86400000
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Frontend Environment Variables
STRIPE_PUBLISHABLE_KEY=pk_live_<your-live-publishable-key>
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
FACEBOOK_APP_ID=<your-production-facebook-app-id>
```

## 🔄 Migration from Current Setup

### 1. Current Development Values → Production Secrets

| Current (Development) | Production Secret Name | Notes |
|----------------------|------------------------|-------|
| `DB_PASSWORD=admin` | `DATABASE_PASSWORD` | Generate secure password |
| `JWT_SECRET=aVNZ...` | `JWT_SECRET` | Generate new 64-char secret |
| `pk_test_51QtTgO...` | `STRIPE_SECRET_KEY` | Replace with live key |
| `MAIL_PASSWORD=` | `MAIL_PASSWORD` | Add production email password |
| `892690056358950` | `FACEBOOK_CLIENT_ID` | Use production Facebook app |

### 2. New Production Requirements

| Secret | Purpose | How to Obtain |
|--------|---------|---------------|
| `DEPLOY_SSH_KEY` | Server deployment | Generate new SSH key for CI/CD |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | From Stripe Dashboard |
| `RABBITMQ_PASSWORD` | Message queue | Generate secure password |
| `REDIS_PASSWORD` | Cache security | Generate secure password |

## 🛠️ Setup Commands

### Generate Secure Passwords
```bash
# Database password
openssl rand -base64 32

# JWT secret (64 characters)
openssl rand -base64 64

# Redis password
openssl rand -base64 24

# RabbitMQ password
openssl rand -base64 24

# SSL keystore password
openssl rand -base64 16
```

### Generate SSH Key for Deployment
```bash
# Generate deployment SSH key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/lunara_deploy

# Copy private key for GitHub secret
cat ~/.ssh/lunara_deploy

# Copy public key for server
cat ~/.ssh/lunara_deploy.pub
```

## ⚠️ Security Considerations

### Current Issues to Address:
1. **Test Stripe keys in production configs** - Replace with live keys
2. **Hardcoded localhost URLs** - Replace with production domains  
3. **Weak database password** - Generate strong password
4. **Missing webhook secrets** - Add Stripe webhook validation
5. **No Redis authentication** - Add password protection
6. **Development SSL certs** - Replace with production certificates

### Production Security Checklist:
- [ ] All test/development keys replaced with production keys
- [ ] Strong passwords generated for all services
- [ ] SSL certificates from trusted CA (Let's Encrypt)
- [ ] Database connections encrypted
- [ ] Redis password authentication enabled
- [ ] Webhook signature validation configured
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured
- [ ] Monitoring and alerting set up
