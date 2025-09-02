#!/bin/bash

# 🔐 GitHub Secrets Setup Script for Lunara Platform
# This script helps you configure all required secrets for CI/CD

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Repository information
REPO_OWNER="ddimitko"
REPO_NAME="blush"

echo -e "${BLUE}🔐 Lunara Platform - GitHub Secrets Setup${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed.${NC}"
    echo -e "${YELLOW}Please install it from: https://cli.github.com/${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI.${NC}"
    echo -e "${YELLOW}Please run: gh auth login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is installed and authenticated${NC}"
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local is_required=${3:-true}
    
    echo -e "${BLUE}Setting up: ${secret_name}${NC}"
    echo -e "${YELLOW}Description: ${secret_description}${NC}"
    
    if [ "$is_required" = true ]; then
        echo -e "${RED}⚠️  This secret is REQUIRED for CI/CD to work${NC}"
    fi
    
    read -p "Enter value for ${secret_name} (or press Enter to skip): " -s secret_value
    echo ""
    
    if [ -n "$secret_value" ]; then
        if gh secret set "$secret_name" --body "$secret_value" --repo "$REPO_OWNER/$REPO_NAME"; then
            echo -e "${GREEN}✅ Successfully set ${secret_name}${NC}"
        else
            echo -e "${RED}❌ Failed to set ${secret_name}${NC}"
        fi
    else
        echo -e "${YELLOW}⏭️  Skipped ${secret_name}${NC}"
    fi
    echo ""
}

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

echo -e "${BLUE}🔧 Starting secrets configuration...${NC}"
echo ""

# Database Configuration
echo -e "${BLUE}📊 DATABASE CONFIGURATION${NC}"
echo -e "${BLUE}=========================${NC}"

set_secret "DATABASE_URL" "Production database connection string (e.g., jdbc:postgresql://host:5432/lunara_prod)" true
set_secret "DATABASE_USERNAME" "Database username for production" true

echo -e "${YELLOW}💡 Generating secure database password...${NC}"
DB_PASSWORD=$(generate_password)
echo -e "${GREEN}Generated password: ${DB_PASSWORD}${NC}"
echo -e "${YELLOW}Setting DATABASE_PASSWORD...${NC}"
if gh secret set "DATABASE_PASSWORD" --body "$DB_PASSWORD" --repo "$REPO_OWNER/$REPO_NAME"; then
    echo -e "${GREEN}✅ Successfully set DATABASE_PASSWORD${NC}"
else
    echo -e "${RED}❌ Failed to set DATABASE_PASSWORD${NC}"
fi
echo ""

# Redis Configuration
echo -e "${BLUE}🔴 REDIS CONFIGURATION${NC}"
echo -e "${BLUE}======================${NC}"

set_secret "REDIS_HOST" "Redis server hostname" true
set_secret "REDIS_PORT" "Redis server port (default: 6379)" false

echo -e "${YELLOW}💡 Generating secure Redis password...${NC}"
REDIS_PASSWORD=$(generate_password)
echo -e "${GREEN}Generated password: ${REDIS_PASSWORD}${NC}"
echo -e "${YELLOW}Setting REDIS_PASSWORD...${NC}"
if gh secret set "REDIS_PASSWORD" --body "$REDIS_PASSWORD" --repo "$REPO_OWNER/$REPO_NAME"; then
    echo -e "${GREEN}✅ Successfully set REDIS_PASSWORD${NC}"
else
    echo -e "${RED}❌ Failed to set REDIS_PASSWORD${NC}"
fi
echo ""

# JWT Configuration
echo -e "${BLUE}🔑 JWT SECURITY CONFIGURATION${NC}"
echo -e "${BLUE}=============================${NC}"

echo -e "${YELLOW}💡 Generating secure JWT secret...${NC}"
JWT_SECRET=$(generate_jwt_secret)
echo -e "${GREEN}Generated JWT secret (64 chars): ${JWT_SECRET:0:20}...${NC}"
echo -e "${YELLOW}Setting JWT_SECRET...${NC}"
if gh secret set "JWT_SECRET" --body "$JWT_SECRET" --repo "$REPO_OWNER/$REPO_NAME"; then
    echo -e "${GREEN}✅ Successfully set JWT_SECRET${NC}"
else
    echo -e "${RED}❌ Failed to set JWT_SECRET${NC}"
fi
echo ""

# Stripe Configuration
echo -e "${BLUE}💳 STRIPE CONFIGURATION${NC}"
echo -e "${BLUE}======================${NC}"
echo -e "${RED}⚠️  IMPORTANT: Use LIVE Stripe keys for production!${NC}"

set_secret "STRIPE_SECRET_KEY" "Stripe secret key (sk_live_...)" true
set_secret "STRIPE_WEBHOOK_SECRET" "Stripe webhook secret (whsec_...)" true

# Email Configuration
echo -e "${BLUE}📧 EMAIL CONFIGURATION${NC}"
echo -e "${BLUE}======================${NC}"

set_secret "MAIL_HOST" "SMTP server hostname (e.g., smtp.gmail.com)" true
set_secret "MAIL_PORT" "SMTP server port (default: 587)" false
set_secret "MAIL_USERNAME" "SMTP username/email" true
set_secret "MAIL_PASSWORD" "SMTP password or app password" true

# OAuth2 Configuration
echo -e "${BLUE}🔐 OAUTH2 CONFIGURATION${NC}"
echo -e "${BLUE}======================${NC}"

set_secret "FACEBOOK_CLIENT_ID" "Facebook App ID for production" false
set_secret "FACEBOOK_CLIENT_SECRET" "Facebook App Secret for production" false
set_secret "GOOGLE_CLIENT_ID" "Google OAuth Client ID for production" false
set_secret "GOOGLE_CLIENT_SECRET" "Google OAuth Client Secret for production" false

# RabbitMQ Configuration
echo -e "${BLUE}🐰 RABBITMQ CONFIGURATION${NC}"
echo -e "${BLUE}=========================${NC}"

set_secret "RABBITMQ_HOST" "RabbitMQ server hostname" true
set_secret "RABBITMQ_PORT" "RabbitMQ server port (default: 5672)" false
set_secret "RABBITMQ_USERNAME" "RabbitMQ username" true

echo -e "${YELLOW}💡 Generating secure RabbitMQ password...${NC}"
RABBITMQ_PASSWORD=$(generate_password)
echo -e "${GREEN}Generated password: ${RABBITMQ_PASSWORD}${NC}"
echo -e "${YELLOW}Setting RABBITMQ_PASSWORD...${NC}"
if gh secret set "RABBITMQ_PASSWORD" --body "$RABBITMQ_PASSWORD" --repo "$REPO_OWNER/$REPO_NAME"; then
    echo -e "${GREEN}✅ Successfully set RABBITMQ_PASSWORD${NC}"
else
    echo -e "${RED}❌ Failed to set RABBITMQ_PASSWORD${NC}"
fi
echo ""

# Deployment Configuration
echo -e "${BLUE}🚀 DEPLOYMENT CONFIGURATION${NC}"
echo -e "${BLUE}===========================${NC}"

set_secret "DEPLOY_HOST" "Production server IP or domain" true
set_secret "DEPLOY_USER" "SSH username for deployment (e.g., deploy)" true
set_secret "DEPLOY_SSH_KEY" "SSH private key for deployment (full key including headers)" true
set_secret "DEPLOY_PORT" "SSH port (default: 22)" false

# SSL Configuration
echo -e "${BLUE}🔒 SSL CONFIGURATION${NC}"
echo -e "${BLUE}===================${NC}"

echo -e "${YELLOW}💡 Generating secure SSL keystore password...${NC}"
SSL_PASSWORD=$(generate_password)
echo -e "${GREEN}Generated password: ${SSL_PASSWORD}${NC}"
echo -e "${YELLOW}Setting SERVER_SSL_KEY_STORE_PASSWORD...${NC}"
if gh secret set "SERVER_SSL_KEY_STORE_PASSWORD" --body "$SSL_PASSWORD" --repo "$REPO_OWNER/$REPO_NAME"; then
    echo -e "${GREEN}✅ Successfully set SERVER_SSL_KEY_STORE_PASSWORD${NC}"
else
    echo -e "${RED}❌ Failed to set SERVER_SSL_KEY_STORE_PASSWORD${NC}"
fi
echo ""

# iOS Configuration (if needed)
echo -e "${BLUE}📱 iOS CONFIGURATION (Optional)${NC}"
echo -e "${BLUE}===============================${NC}"

set_secret "BUILD_CERTIFICATE_BASE64" "Base64 encoded iOS distribution certificate (.p12)" false
set_secret "P12_PASSWORD" "Password for iOS certificate" false
set_secret "BUILD_PROVISION_PROFILE_BASE64" "Base64 encoded provisioning profile" false
set_secret "DEVELOPMENT_TEAM_ID" "Apple Developer Team ID" false
set_secret "KEYCHAIN_PASSWORD" "Temporary keychain password for CI" false
set_secret "APP_STORE_CONNECT_API_KEY_ID" "App Store Connect API Key ID" false
set_secret "APP_STORE_CONNECT_ISSUER_ID" "App Store Connect Issuer ID" false
set_secret "APP_STORE_CONNECT_API_KEY_BASE64" "Base64 encoded App Store Connect API key (.p8)" false

# Notifications
echo -e "${BLUE}🔔 NOTIFICATIONS (Optional)${NC}"
echo -e "${BLUE}==========================${NC}"

set_secret "SLACK_WEBHOOK" "Slack webhook URL for deployment notifications" false

echo ""
echo -e "${GREEN}🎉 Secrets configuration completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "${YELLOW}1. Review all secrets in GitHub Settings → Secrets and variables → Actions${NC}"
echo -e "${YELLOW}2. Set up environment variables using the GitHub web interface${NC}"
echo -e "${YELLOW}3. Test the CI/CD pipeline by pushing to develop branch${NC}"
echo -e "${YELLOW}4. Check .github/EXTRACTED_SECRETS.md for environment variables setup${NC}"
echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo -e "${YELLOW}• Repository Secrets: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions${NC}"
echo -e "${YELLOW}• Environment Variables: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/environments${NC}"
echo -e "${YELLOW}• Actions: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions${NC}"
