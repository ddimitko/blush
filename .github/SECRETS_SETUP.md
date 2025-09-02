# GitHub Secrets and Environment Variables Setup

This document outlines all the secrets and environment variables needed for the CI/CD pipelines.

## 🔐 Repository Secrets

Go to **Settings** → **Secrets and variables** → **Actions** to add these secrets:

### Database & Infrastructure
```
DATABASE_URL=jdbc:postgresql://your-db-host:5432/lunara_prod
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### Stripe Configuration
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### JWT & Security
```
JWT_SECRET=your-super-secure-jwt-secret-key-here
```

### Email Configuration
```
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password
```

### RabbitMQ Configuration
```
RABBITMQ_HOST=your-rabbitmq-host
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=your_rabbitmq_user
RABBITMQ_PASSWORD=your_rabbitmq_password
```

### Deployment Configuration
```
DEPLOY_HOST=your-server-ip-or-domain
DEPLOY_USER=your-server-username
DEPLOY_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
your-private-ssh-key-content-here
-----END OPENSSH PRIVATE KEY-----
DEPLOY_PORT=22
```

### iOS Code Signing (Base64 encoded)
```
BUILD_CERTIFICATE_BASE64=base64-encoded-p12-certificate
P12_PASSWORD=your-certificate-password
BUILD_PROVISION_PROFILE_BASE64=base64-encoded-provisioning-profile
DEVELOPMENT_TEAM_ID=your-apple-team-id
KEYCHAIN_PASSWORD=temporary-keychain-password
```

### App Store Connect API
```
APP_STORE_CONNECT_API_KEY_ID=your-api-key-id
APP_STORE_CONNECT_ISSUER_ID=your-issuer-id
APP_STORE_CONNECT_API_KEY_BASE64=base64-encoded-p8-key
```

### Notifications
```
SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

## 🌍 Environment Variables

Go to **Settings** → **Environments** to create environments and add these variables:

### Production Environment
```
APP_URL=https://your-domain.com
API_URL=https://api.your-domain.com
DEPLOY_PATH=/opt/lunara
SERVER_PORT=8080
LOG_LEVEL=INFO
JWT_EXPIRATION=86400000
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### Frontend Environment Variables
```
STRIPE_PUBLISHABLE_KEY=pk_live_...
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### TestFlight Environment
```
APP_URL=https://testflight.apple.com
```

## 📋 Setup Instructions

### 1. Database Secrets
```bash
# Generate a secure database password
openssl rand -base64 32

# Your DATABASE_URL should look like:
# jdbc:postgresql://your-host:5432/lunara_prod
```

### 2. JWT Secret
```bash
# Generate a secure JWT secret
openssl rand -base64 64
```

### 3. iOS Code Signing Setup

#### Export Certificate as Base64:
```bash
# Export your distribution certificate to .p12
# Then convert to base64:
base64 -i YourCertificate.p12 | pbcopy
```

#### Export Provisioning Profile as Base64:
```bash
# Convert your .mobileprovision file to base64:
base64 -i YourProfile.mobileprovision | pbcopy
```

#### App Store Connect API Key:
```bash
# Convert your .p8 key file to base64:
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
```

### 4. SSH Key for Deployment
```bash
# Generate a new SSH key for deployment:
ssh-keygen -t ed25519 -C "github-actions-deploy"

# Copy the private key content (including headers):
cat ~/.ssh/id_ed25519 | pbcopy

# Add the public key to your server:
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server
```

### 5. Slack Webhook (Optional)
1. Go to your Slack workspace
2. Create a new app or use existing one
3. Enable Incoming Webhooks
4. Create a webhook URL for your channel

## 🔒 Security Best Practices

1. **Rotate secrets regularly** - especially JWT secrets and API keys
2. **Use environment-specific secrets** - different keys for staging/production
3. **Limit secret access** - only give access to necessary team members
4. **Monitor secret usage** - check GitHub Actions logs for any issues
5. **Use least privilege** - database users should have minimal required permissions

## 🧪 Testing Your Setup

### Test Webapp Pipeline:
```bash
# Push to develop branch to trigger CI
git checkout develop
git commit --allow-empty -m "test: trigger CI pipeline"
git push origin develop
```

### Test iOS Pipeline:
```bash
# Push to ios-develop branch to trigger CI
git checkout ios-develop
git commit --allow-empty -m "test: trigger iOS CI pipeline"
git push origin ios-develop
```

### Test Production Deployment:
```bash
# Push to main branch to trigger production deployment
git checkout main
git merge develop
git push origin main
```

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify network access from GitHub Actions to your database

2. **iOS Code Signing Failed**
   - Ensure certificates are not expired
   - Check provisioning profile matches your app bundle ID
   - Verify DEVELOPMENT_TEAM_ID is correct

3. **Deployment Failed**
   - Check SSH key has proper permissions
   - Verify server has Docker and docker-compose installed
   - Ensure DEPLOY_PATH directory exists and is writable

4. **Stripe Integration Issues**
   - Verify you're using live keys for production
   - Check webhook endpoints are accessible
   - Ensure STRIPE_WEBHOOK_SECRET matches your webhook configuration

## 📞 Support

If you encounter issues:
1. Check GitHub Actions logs for detailed error messages
2. Verify all secrets are properly set and not expired
3. Test individual components locally when possible
4. Review this documentation for any missed steps
