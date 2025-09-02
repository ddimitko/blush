# Contributing to Lunara

Thank you for your interest in contributing to Lunara! This document provides guidelines and information for contributors.

## 🔒 Important Notice

This is a **private, proprietary project**. Contributions are limited to authorized team members only. All code, documentation, and related materials are confidential and subject to the terms outlined in the LICENSE file.

## 🚀 Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- Docker & Docker Compose
- Git

### Development Setup
```bash
# Clone the repository
git clone https://github.com/your-username/lunara.git
cd lunara

# Set up development environment
make setup

# Start development servers
make dev-backend    # Terminal 1
make dev-frontend   # Terminal 2
```

## 🔄 Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature development branches
- `hotfix/*` - Critical bug fixes
- `release/*` - Release preparation branches

### Workflow Steps
1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards
   - Write tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   make test           # Run all tests
   make lint           # Check code quality
   make security-scan  # Security checks
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR via GitHub interface
   ```

## 📝 Coding Standards

### Backend (Spring Boot/Groovy)
- Follow Spring Boot best practices
- Use meaningful variable and method names
- Write comprehensive JavaDoc for public methods
- Implement proper error handling
- Use dependency injection appropriately

### Frontend (React/TypeScript)
- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Use meaningful component and variable names
- Implement proper error boundaries
- Follow the established folder structure

### Code Quality
- **ESLint**: Frontend linting enforced
- **Prettier**: Code formatting enforced
- **SonarQube**: Code quality analysis
- **Test Coverage**: Minimum 70% coverage required

## 🧪 Testing Guidelines

### Backend Testing
```bash
# Run backend tests
./gradlew test

# Run with coverage
./gradlew test jacocoTestReport
```

### Frontend Testing
```bash
# Run frontend tests
cd bhfrontend && npm test

# Run with coverage
npm test -- --coverage
```

### Test Types
- **Unit Tests**: Test individual components/functions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows

## 🔒 Security Guidelines

### Sensitive Data
- **Never commit** secrets, passwords, or API keys
- Use environment variables for configuration
- Sanitize all user inputs
- Implement proper authentication/authorization

### Security Checklist
- [ ] Input validation implemented
- [ ] SQL injection protection in place
- [ ] XSS protection implemented
- [ ] Authentication properly handled
- [ ] Authorization checks in place
- [ ] Sensitive data not logged

## 📋 Commit Message Format

Use conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `chore`: Maintenance tasks

### Examples
```
feat(auth): add JWT token refresh functionality
fix(booking): resolve slot locking race condition
docs(api): update authentication endpoint documentation
```

## 🔍 Code Review Process

### Review Criteria
- [ ] Code quality and readability
- [ ] Test coverage and quality
- [ ] Security considerations
- [ ] Performance impact
- [ ] Documentation updates
- [ ] Breaking changes identified

### Review Guidelines
- Be constructive and respectful
- Explain the reasoning behind suggestions
- Test the changes locally when possible
- Approve only when confident in the changes

## 🚀 Release Process

### Version Numbering
We follow Semantic Versioning (SemVer):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

### Release Steps
1. Create release branch from `develop`
2. Update version numbers
3. Update CHANGELOG.md
4. Test thoroughly
5. Merge to `main`
6. Tag release
7. Deploy to production

## 🛠️ Development Tools

### Recommended IDE Setup
- **IntelliJ IDEA** for backend development
- **VS Code** for frontend development
- **Docker Desktop** for containerization
- **Postman** for API testing

### Useful Commands
```bash
# Development
make setup              # Set up development environment
make dev               # Start development servers
make test              # Run all tests
make lint              # Run linting
make format            # Format code

# Deployment
make deploy-staging    # Deploy to staging
make deploy-production # Deploy to production
make health           # Check application health
make backup           # Create backup
```

## 📞 Getting Help

### Resources
- **Documentation**: Check README.md and CI_CD_SETUP_GUIDE.md
- **API Docs**: Available at `/api/docs` when running locally
- **Team Chat**: Use designated communication channels
- **Issue Tracker**: GitHub Issues for bug reports and feature requests

### Contact
For questions or support:
- Create an issue in the repository
- Contact the development team lead
- Use team communication channels

## 🎯 Performance Guidelines

### Backend Performance
- Use database connection pooling
- Implement caching where appropriate
- Optimize database queries
- Use async processing for heavy operations

### Frontend Performance
- Implement lazy loading
- Optimize bundle size
- Use React.memo for expensive components
- Minimize re-renders

## 📊 Monitoring and Logging

### Logging Guidelines
- Use appropriate log levels (ERROR, WARN, INFO, DEBUG)
- Don't log sensitive information
- Include relevant context in log messages
- Use structured logging where possible

### Monitoring
- Monitor application health endpoints
- Track performance metrics
- Set up alerts for critical issues
- Review logs regularly

---

Thank you for contributing to Lunara! Your efforts help make this platform better for everyone in the beauty industry.
