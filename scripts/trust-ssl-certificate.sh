#!/bin/bash

# Trust SSL Certificate Script for Lunara Development
# This script adds the self-signed SSL certificate to macOS keychain
# so browsers will trust it for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CERT_FILE="src/main/resources/localhost.pem"
KEYCHAIN="/Users/$(whoami)/Library/Keychains/login.keychain-db"

echo -e "${BLUE}🔐 Lunara SSL Certificate Trust Manager${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Check if certificate file exists
if [ ! -f "$CERT_FILE" ]; then
    echo -e "${RED}❌ Error: Certificate file not found at $CERT_FILE${NC}"
    echo -e "${YELLOW}💡 Please run ./scripts/generate-ssl-certificates.sh first${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Certificate Information:${NC}"
echo -e "  File: ${CERT_FILE}"
echo -e "  Keychain: ${KEYCHAIN}"
echo ""

# Check if certificate is already in keychain
CERT_SUBJECT=$(openssl x509 -in "$CERT_FILE" -noout -subject | sed 's/subject=//')
echo -e "${YELLOW}🔍 Checking if certificate is already trusted...${NC}"

if security find-certificate -c "localhost" "$KEYCHAIN" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Certificate already exists in keychain${NC}"
    echo -e "${YELLOW}🗑️ Removing existing certificate...${NC}"
    
    # Remove existing certificate
    security delete-certificate -c "localhost" "$KEYCHAIN" 2>/dev/null || true
    echo -e "${GREEN}✅ Existing certificate removed${NC}"
fi

echo -e "${YELLOW}📥 Adding certificate to keychain...${NC}"

# Add certificate to keychain
security add-trusted-cert -d -r trustRoot -k "$KEYCHAIN" "$CERT_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Certificate added to keychain successfully!${NC}"
else
    echo -e "${RED}❌ Failed to add certificate to keychain${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔧 Setting certificate trust settings...${NC}"

# Set trust settings for the certificate
security add-trusted-cert -d -r trustRoot -p ssl -k "$KEYCHAIN" "$CERT_FILE" 2>/dev/null || true

echo -e "${GREEN}✅ Certificate trust settings configured!${NC}"
echo ""

echo -e "${BLUE}📋 Certificate Details:${NC}"
openssl x509 -in "$CERT_FILE" -noout -text | grep -A 1 "Subject:"
openssl x509 -in "$CERT_FILE" -noout -text | grep -A 10 "Subject Alternative Name:" || echo "  No Subject Alternative Names found"

echo ""
echo -e "${GREEN}🎉 SSL Certificate Successfully Trusted!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "  1. Restart your browser completely"
echo -e "  2. Clear browser cache and cookies for lunara.local domains"
echo -e "  3. Visit https://api.lunara.local:8443 to verify the certificate is trusted"
echo -e "  4. Your application should now work without SSL warnings"
echo ""
echo -e "${YELLOW}💡 Note: If you still see SSL warnings, try:${NC}"
echo -e "  - Restart your browser completely"
echo -e "  - Clear all browser data for lunara.local domains"
echo -e "  - Check that the certificate is listed in Keychain Access app"
echo ""
echo -e "${YELLOW}🔍 To verify certificate in Keychain Access:${NC}"
echo -e "  1. Open Keychain Access app"
echo -e "  2. Select 'login' keychain"
echo -e "  3. Look for 'localhost' certificate"
echo -e "  4. Double-click and verify it's marked as 'Always Trust'"
