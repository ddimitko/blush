# 🚀 Deployment Guide

This guide covers the complete deployment process for the Lunara platform.

## 📋 Overview

The CI/CD pipeline automatically handles:
- ✅ Code quality checks and security scanning
- ✅ Automated testing (unit, integration, security)
- ✅ Building and packaging applications
- ✅ Deployment to production environments
- ✅ iOS TestFlight distribution

## 🌊 Deployment Flow

### Web Application Flow
```
develop → CI/CD → staging (optional) → main → production
```

### iOS Application Flow
```
ios-develop → CI/CD → TestFlight → ios-main → App Store
```

## 🔄 Branch Strategy

| Branch | Purpose | Auto-Deploy | Environment |
|--------|---------|-------------|-------------|
| `develop` | Active development | ❌ | Development |
| `main` | Production webapp | ✅ | Production |
| `ios-develop` | iOS development | ❌ | Development |
| `ios-main` | Production iOS | ✅ | TestFlight |

## 🚀 Deployment Processes

### 1. Web Application Deployment

#### Automatic Deployment (Recommended)
```bash
# 1. Merge feature to develop
git checkout develop
git merge feature/your-feature
git push origin develop

# 2. When ready for production
git checkout main
git merge develop
git push origin main  # 🚀 Triggers automatic deployment
```

#### Manual Deployment
```bash
# Trigger manual deployment
gh workflow run webapp-deploy.yml \
  --field environment=production
```

### 2. iOS Application Deployment

#### TestFlight Deployment
```bash
# 1. Merge feature to ios-develop
git checkout ios-develop
git merge feature/your-ios-feature
git push origin ios-develop

# 2. When ready for TestFlight
git checkout ios-main
git merge ios-develop
git push origin ios-main  # 🚀 Triggers TestFlight upload
```

#### Manual TestFlight Upload
```bash
# Trigger manual TestFlight deployment
gh workflow run ios-deploy.yml \
  --field build_number=123 \
  --field release_notes="Bug fixes and improvements"
```

## 🔧 Pre-Deployment Checklist

### Web Application
- [ ] All tests passing in develop branch
- [ ] Security scans completed
- [ ] Database migrations tested
- [ ] Environment variables updated
- [ ] SSL certificates valid
- [ ] CDN/static assets ready
- [ ] Monitoring alerts configured

### iOS Application
- [ ] All tests passing in ios-develop branch
- [ ] Code signing certificates valid
- [ ] Provisioning profiles updated
- [ ] App Store metadata ready
- [ ] TestFlight release notes prepared
- [ ] Privacy policy updated (if needed)

## 🏗️ Infrastructure Requirements

### Production Server Setup
```bash
# 1. Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# 2. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Create deployment directory
sudo mkdir -p /opt/lunara
sudo chown $USER:$USER /opt/lunara

# 4. Set up SSL certificates (Let's Encrypt)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

### Database Setup
```bash
# PostgreSQL with Docker
docker run -d \
  --name lunara-postgres \
  -e POSTGRES_DB=lunara_prod \
  -e POSTGRES_USER=lunara \
  -e POSTGRES_PASSWORD=your-secure-password \
  -v postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15

# Redis with Docker
docker run -d \
  --name lunara-redis \
  -p 6379:6379 \
  redis:7-alpine
```

## 📊 Monitoring & Observability

### Health Checks
The deployment includes automatic health checks:
- **Web App**: `https://your-domain.com/actuator/health`
- **Database**: Connection and query tests
- **Redis**: Ping tests
- **External APIs**: Stripe, email service connectivity

### Monitoring Stack
- **Metrics**: Prometheus + Grafana
- **Logs**: Centralized logging with structured JSON
- **Alerts**: Slack notifications for deployment status
- **Uptime**: External monitoring service recommended

## 🔒 Security Considerations

### Secrets Management
- All secrets stored in GitHub Secrets
- Environment-specific configurations
- Regular secret rotation schedule
- No secrets in code or logs

### SSL/TLS
- HTTPS enforced for all endpoints
- TLS 1.2+ required
- HSTS headers enabled
- Certificate auto-renewal

### Database Security
- Encrypted connections only
- Minimal privilege database users
- Regular security updates
- Backup encryption

## 🚨 Rollback Procedures

### Web Application Rollback
```bash
# 1. Quick rollback using Docker
ssh user@your-server
cd /opt/lunara
docker-compose down
docker pull ghcr.io/ddimitko/blush/lunara-webapp:previous-tag
docker-compose up -d

# 2. Database rollback (if needed)
# Restore from backup taken before deployment
```

### iOS Application Rollback
```bash
# 1. Stop TestFlight distribution
# Go to App Store Connect → TestFlight → Stop Testing

# 2. Revert to previous build
# App Store Connect → TestFlight → Select previous build → Start Testing
```

## 📈 Performance Optimization

### Web Application
- **CDN**: Static assets served via CDN
- **Caching**: Redis for session and application caching
- **Database**: Connection pooling and query optimization
- **Compression**: Gzip/Brotli compression enabled

### iOS Application
- **Bundle Size**: Optimized app bundle
- **Images**: Compressed and optimized assets
- **Network**: Efficient API calls and caching
- **Memory**: Proper memory management

## 🧪 Testing in Production

### Smoke Tests
Automated smoke tests run after deployment:
- User registration and login
- Appointment booking flow
- Payment processing
- Email notifications
- Push notifications (iOS)

### Feature Flags
Use feature flags for:
- Gradual feature rollouts
- A/B testing
- Emergency feature disabling
- User-specific features

## 📞 Support & Troubleshooting

### Common Issues

#### Deployment Failures
1. **Check GitHub Actions logs**
2. **Verify all secrets are set**
3. **Check server resources**
4. **Validate SSL certificates**

#### Database Connection Issues
1. **Check connection strings**
2. **Verify network connectivity**
3. **Check database server status**
4. **Review firewall rules**

#### iOS Code Signing Issues
1. **Check certificate expiration**
2. **Verify provisioning profiles**
3. **Check bundle ID matches**
4. **Validate team ID**

### Emergency Contacts
- **Primary**: ddimitko
- **Infrastructure**: Your hosting provider support
- **DNS**: Your domain registrar support

### Monitoring Alerts
Configure alerts for:
- Application errors (>1% error rate)
- High response times (>2s average)
- Database connection failures
- SSL certificate expiration (30 days)
- Disk space usage (>80%)

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Xcode Cloud Documentation](https://developer.apple.com/xcode-cloud/)
- [App Store Connect API](https://developer.apple.com/app-store-connect/api/)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
