# 🌍 Environment Variables Configuration

This guide shows how to configure GitHub environment variables for different deployment environments.

## 📋 Environment Setup

Go to **Settings** → **Environments** in your GitHub repository to create these environments:

### 1. Production Environment
**Name**: `production`
**Protection Rules**: 
- Required reviewers: ddimitko
- Wait timer: 0 minutes
- Deployment branches: main only

### 2. Staging Environment (Optional)
**Name**: `staging`
**Protection Rules**: 
- Required reviewers: none
- Deployment branches: develop only

### 3. TestFlight Environment
**Name**: `testflight`
**Protection Rules**: 
- Required reviewers: ddimitko
- Deployment branches: ios-main only

## 🔧 Environment Variables by Environment

### Production Environment Variables

```bash
# Application URLs
APP_URL=https://lunara.com
API_URL=https://api.lunara.com
FRONTEND_URL=https://app.lunara.com

# Server Configuration
SERVER_PORT=8443
LOG_LEVEL=INFO
DEPLOY_PATH=/opt/lunara

# JWT Configuration
JWT_EXPIRATION=86400000

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://lunara.com,https://app.lunara.com,https://www.lunara.com

# Frontend Public Variables
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
FACEBOOK_APP_ID=YOUR_PRODUCTION_FACEBOOK_APP_ID
GOOGLE_CLIENT_ID=YOUR_PRODUCTION_GOOGLE_CLIENT_ID

# Rate Limiting
RATE_LIMIT_BOOKING_ENDPOINTS=10
RATE_LIMIT_SEARCH_ENDPOINTS=30
RATE_LIMIT_PAYMENT_ENDPOINTS=5

# Performance Settings
BOOKING_SLOT_LOCK_DURATION=600000
BOOKING_MAX_CONCURRENT_LOCKS=100
SEARCH_MAX_RESULTS=50
SEARCH_CACHE_TTL=600000

# SSL Configuration
SERVER_SSL_ENABLED=true
SERVER_SSL_KEY_STORE=classpath:production.p12
SERVER_SSL_KEY_STORE_TYPE=PKCS12
SERVER_SSL_KEY_ALIAS=lunara-api
```

### Staging Environment Variables

```bash
# Application URLs
APP_URL=https://staging.lunara.com
API_URL=https://api-staging.lunara.com
FRONTEND_URL=https://app-staging.lunara.com

# Server Configuration
SERVER_PORT=8443
LOG_LEVEL=DEBUG
DEPLOY_PATH=/opt/lunara-staging

# JWT Configuration
JWT_EXPIRATION=86400000

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://staging.lunara.com,https://app-staging.lunara.com

# Frontend Public Variables (Test Keys)
STRIPE_PUBLISHABLE_KEY=pk_test_51QtTgOE2dBEKUmD174iW0Lk9h9YazQfOrfLeACcAlYfHoFDyUww1VP4gTILNwfZC7y1cTLO0vBY5tYPHahyCuPsz008YkKGJlv
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
FACEBOOK_APP_ID=892690056358950

# Performance Settings (More permissive for testing)
RATE_LIMIT_BOOKING_ENDPOINTS=50
RATE_LIMIT_SEARCH_ENDPOINTS=100
RATE_LIMIT_PAYMENT_ENDPOINTS=20
```

### TestFlight Environment Variables

```bash
# App Store Configuration
APP_URL=https://testflight.apple.com
BUILD_CONFIGURATION=Release
ENABLE_BITCODE=false
ENABLE_TESTFLIGHT=true

# API Configuration for iOS
API_BASE_URL=https://api.lunara.com
WS_BASE_URL=wss://api.lunara.com

# Feature Flags for iOS
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
```

## 🛠️ Manual Setup Instructions

### Step 1: Create Environments

1. Go to your repository on GitHub
2. Click **Settings** → **Environments**
3. Click **New environment**
4. Create each environment with the names above

### Step 2: Configure Protection Rules

For **Production Environment**:
1. Check "Required reviewers" and add yourself
2. Check "Deployment branches" and select "Selected branches"
3. Add rule: `main`

For **TestFlight Environment**:
1. Check "Required reviewers" and add yourself
2. Check "Deployment branches" and select "Selected branches"  
3. Add rule: `ios-main`

### Step 3: Add Environment Variables

For each environment:
1. Click on the environment name
2. Click **Add variable**
3. Add each variable from the lists above

## 🔄 Current Values Migration

### From Your Current `.env.development`:

| Current Variable | Production Value | Environment |
|------------------|------------------|-------------|
| `REACT_APP_API_URL=https://109.104.206.19:8443/api` | `API_URL=https://api.lunara.com` | production |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...` | `STRIPE_PUBLISHABLE_KEY=pk_live_...` | production |
| `REACT_APP_FACEBOOK_APP_ID=892690056358950` | `FACEBOOK_APP_ID=<prod-app-id>` | production |
| `DB_HOST=localhost` | Not needed (in secrets) | - |
| `JWT_EXPIRATION=86400000` | `JWT_EXPIRATION=86400000` | all |

### From Your Current `bhfrontend/.env`:

| Current Variable | Production Value | Environment |
|------------------|------------------|-------------|
| `REACT_APP_API_URL=https://109.104.206.19:8443/api` | `API_URL=https://api.lunara.com` | production |
| `REACT_APP_WS_URL=wss://109.104.206.19:8443` | `WS_BASE_URL=wss://api.lunara.com` | production |

## 🚨 Important Notes

### Security Considerations:
- **Environment variables are visible** in GitHub Actions logs
- **Only put non-sensitive data** in environment variables
- **Use secrets for sensitive data** like passwords and private keys

### What Goes Where:
- **Secrets**: Passwords, private keys, API secrets, database credentials
- **Environment Variables**: URLs, public keys, configuration flags, timeouts

### Domain Configuration:
- Replace all `localhost` and IP addresses with your production domains
- Ensure SSL certificates match your domains
- Update CORS origins to match your frontend domains

## 🧪 Testing Configuration

### Test Environment Variables:
```bash
# Test that environment variables are accessible in workflows
echo "API_URL: ${{ vars.API_URL }}"
echo "STRIPE_PUBLISHABLE_KEY: ${{ vars.STRIPE_PUBLISHABLE_KEY }}"
```

### Validate Configuration:
1. Push to `develop` branch to test staging environment
2. Push to `main` branch to test production environment
3. Check GitHub Actions logs for variable values
4. Verify deployment uses correct URLs and configurations

## 🔗 Related Documentation

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Environment Variables vs Secrets](https://docs.github.com/en/actions/learn-github-actions/variables#defining-environment-variables-for-a-single-workflow)
- [Deployment Protection Rules](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment#environment-protection-rules)
