#!/bin/bash

# Setup Localhost SSL for Lunara Development
# This script helps set up SSL certificate trust for localhost development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Lunara Localhost SSL Setup${NC}"
echo -e "${BLUE}=============================${NC}"
echo ""

# Check if certificate exists
CERT_FILE="src/main/resources/localhost.pem"
if [ ! -f "$CERT_FILE" ]; then
    echo -e "${RED}❌ Certificate file not found: $CERT_FILE${NC}"
    echo -e "${YELLOW}💡 Run ./scripts/generate-ssl-certificates.sh first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Certificate file found: $CERT_FILE${NC}"

# Add certificate to macOS keychain
echo -e "${YELLOW}📥 Adding certificate to macOS keychain...${NC}"

# Remove existing certificate if it exists
security delete-certificate -c "localhost" 2>/dev/null || true

# Add certificate to keychain
if security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain-db "$CERT_FILE"; then
    echo -e "${GREEN}✅ Certificate added to keychain successfully!${NC}"
else
    echo -e "${YELLOW}⚠️ Certificate may already exist or require manual trust${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next Steps for Browser Access:${NC}"
echo ""
echo -e "${YELLOW}1. Start your Spring Boot application:${NC}"
echo -e "   ./gradlew bootRun"
echo ""
echo -e "${YELLOW}2. Test the API endpoint:${NC}"
echo -e "   curl -k https://localhost:8443/api/health"
echo ""
echo -e "${YELLOW}3. Access in browser:${NC}"
echo -e "   https://localhost:8443"
echo ""
echo -e "${YELLOW}4. If you see SSL warnings in browser:${NC}"
echo -e "   - Click 'Advanced' or 'Show Details'"
echo -e "   - Click 'Proceed to localhost (unsafe)' or 'Accept Risk'"
echo -e "   - This is normal for self-signed certificates in development"
echo ""
echo -e "${YELLOW}5. For frontend development:${NC}"
echo -e "   - Make sure your frontend is configured to use https://localhost:8443/api"
echo -e "   - CORS is configured to allow localhost:3000 and localhost:8443"
echo ""
echo -e "${GREEN}🎉 SSL setup complete!${NC}"
echo ""
echo -e "${BLUE}💡 Troubleshooting:${NC}"
echo -e "   - If still getting SSL errors, restart your browser completely"
echo -e "   - Clear browser cache and cookies for localhost"
echo -e "   - Check that the backend is running on port 8443"
echo -e "   - Verify CORS configuration includes your frontend URL"
