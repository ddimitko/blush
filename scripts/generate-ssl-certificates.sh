#!/bin/bash

# SSL Certificate Generation Script for Lunara Development
# This script generates proper self-signed SSL certificates for localhost development
# with the correct alias structure expected by the Spring Boot application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CERT_DIR="src/main/resources"
KEYSTORE_PASSWORD="changeit"
KEY_ALIAS="lunara-api"
VALIDITY_DAYS=365

# Certificate details
COUNTRY="US"
STATE="California"
CITY="San Francisco"
ORGANIZATION="Lunara"
ORGANIZATIONAL_UNIT="Development"
COMMON_NAME="localhost"

echo -e "${BLUE}🔐 Lunara SSL Certificate Generator${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
    echo -e "${RED}❌ Error: keytool not found. Please install Java JDK.${NC}"
    exit 1
fi

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ Error: openssl not found. Please install OpenSSL.${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Certificate Configuration:${NC}"
echo -e "  Directory: ${CERT_DIR}"
echo -e "  Alias: ${KEY_ALIAS}"
echo -e "  Common Name: ${COMMON_NAME}"
echo -e "  Validity: ${VALIDITY_DAYS} days"
echo ""

# Create certificate directory if it doesn't exist
mkdir -p "${CERT_DIR}"

# Remove existing certificates
echo -e "${YELLOW}🧹 Cleaning up existing certificates...${NC}"
rm -f "${CERT_DIR}/production.p12"
rm -f "${CERT_DIR}/localhost.p12"
rm -f "${CERT_DIR}/keystore.p12"
rm -f "${CERT_DIR}/localhost.pem"
rm -f "${CERT_DIR}/localhost-key.pem"

# Generate private key
echo -e "${YELLOW}🔑 Generating private key...${NC}"
openssl genrsa -out "${CERT_DIR}/localhost-key.pem" 2048

# Create certificate signing request configuration
echo -e "${YELLOW}📝 Creating certificate configuration...${NC}"
cat > "${CERT_DIR}/cert.conf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = ${COUNTRY}
ST = ${STATE}
L = ${CITY}
O = ${ORGANIZATION}
OU = ${ORGANIZATIONAL_UNIT}
CN = ${COMMON_NAME}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation,digitalSignature,keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = api.lunara.local
DNS.3 = lunara.local
DNS.4 = app.lunara.local
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = 192.168.0.191
IP.4 = 109.104.206.19
EOF

# Generate certificate signing request
echo -e "${YELLOW}📋 Generating certificate signing request...${NC}"
openssl req -new -key "${CERT_DIR}/localhost-key.pem" -out "${CERT_DIR}/localhost.csr" -config "${CERT_DIR}/cert.conf"

# Generate self-signed certificate
echo -e "${YELLOW}🏆 Generating self-signed certificate...${NC}"
openssl x509 -req -in "${CERT_DIR}/localhost.csr" -signkey "${CERT_DIR}/localhost-key.pem" -out "${CERT_DIR}/localhost.pem" -days ${VALIDITY_DAYS} -extensions v3_req -extfile "${CERT_DIR}/cert.conf"

# Create PKCS12 keystore with the correct alias
echo -e "${YELLOW}📦 Creating PKCS12 keystore with alias '${KEY_ALIAS}'...${NC}"
openssl pkcs12 -export -in "${CERT_DIR}/localhost.pem" -inkey "${CERT_DIR}/localhost-key.pem" -out "${CERT_DIR}/production.p12" -name "${KEY_ALIAS}" -passout pass:${KEYSTORE_PASSWORD}

# Create a copy for localhost.p12 (for compatibility)
cp "${CERT_DIR}/production.p12" "${CERT_DIR}/localhost.p12"

# Create keystore.p12 for tests
cp "${CERT_DIR}/production.p12" "${CERT_DIR}/keystore.p12"

# Verify the keystore
echo -e "${YELLOW}🔍 Verifying keystore...${NC}"
keytool -list -keystore "${CERT_DIR}/production.p12" -storetype PKCS12 -storepass ${KEYSTORE_PASSWORD}

# Clean up temporary files
echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -f "${CERT_DIR}/localhost.csr"
rm -f "${CERT_DIR}/cert.conf"

echo ""
echo -e "${GREEN}✅ SSL certificates generated successfully!${NC}"
echo ""
echo -e "${BLUE}📁 Generated files:${NC}"
echo -e "  ${CERT_DIR}/production.p12 (Main keystore with alias: ${KEY_ALIAS})"
echo -e "  ${CERT_DIR}/localhost.p12 (Copy for compatibility)"
echo -e "  ${CERT_DIR}/keystore.p12 (Copy for tests)"
echo -e "  ${CERT_DIR}/localhost.pem (Certificate file)"
echo -e "  ${CERT_DIR}/localhost-key.pem (Private key file)"
echo ""
echo -e "${BLUE}🔧 Configuration:${NC}"
echo -e "  Keystore Password: ${KEYSTORE_PASSWORD}"
echo -e "  Key Alias: ${KEY_ALIAS}"
echo -e "  Valid for: ${VALIDITY_DAYS} days"
echo ""
echo -e "${GREEN}🚀 Your Spring Boot application should now start successfully with SSL!${NC}"
echo ""
echo -e "${YELLOW}💡 Note: These are self-signed certificates for development only.${NC}"
echo -e "${YELLOW}   For production, use proper CA-signed certificates.${NC}"
