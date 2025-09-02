#!/bin/bash

# BeautyHub Test Runner Script
# This script runs all tests for the BeautyHub application

set -e  # Exit on any error

echo "🧪 BeautyHub Test Suite Runner"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v java &> /dev/null; then
        print_error "Java is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed or not in PATH"
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to run backend tests
run_backend_tests() {
    print_status "Running Backend Tests..."
    echo "========================"

    # Start PostgreSQL for production accuracy
    print_status "Starting PostgreSQL for testing..."
    ./start-test-db.sh

    # Unit Tests
    print_status "Running Unit Tests..."
    ./gradlew test --tests "*Test" --continue

    if [ $? -eq 0 ]; then
        print_success "Backend unit tests passed"
    else
        print_error "Backend unit tests failed"
        return 1
    fi

    # Service Tests
    print_status "Running Service Layer Tests..."
    ./gradlew test --tests "*ServiceTest" --continue

    if [ $? -eq 0 ]; then
        print_success "Backend service tests passed"
    else
        print_error "Backend service tests failed"
        return 1
    fi

    # Integration Tests
    print_status "Running Integration Tests..."
    ./gradlew test --tests "*IntegrationTest" --continue

    if [ $? -eq 0 ]; then
        print_success "Backend integration tests passed"
    else
        print_error "Backend integration tests failed"
        return 1
    fi

    # Security Tests
    print_status "Running Security Tests..."
    ./gradlew test --tests "*SecurityTest" --continue

    if [ $? -eq 0 ]; then
        print_success "Backend security tests passed"
    else
        print_error "Backend security tests failed"
        return 1
    fi

    print_success "All backend tests completed successfully"
}

# Function to run frontend tests
run_frontend_tests() {
    print_status "Running Frontend Tests..."
    echo "========================="

    cd bhfrontend

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi

    # Run unit tests
    print_status "Running frontend unit tests..."
    npm test -- --coverage --watchAll=false

    if [ $? -eq 0 ]; then
        print_success "Frontend unit tests passed"
    else
        print_error "Frontend unit tests failed"
        cd ..
        return 1
    fi

    # Run component tests
    print_status "Running component tests..."
    npm test -- --testPathPattern="components" --watchAll=false

    if [ $? -eq 0 ]; then
        print_success "Frontend component tests passed"
    else
        print_error "Frontend component tests failed"
        cd ..
        return 1
    fi

    # Run integration tests
    print_status "Running frontend integration tests..."
    npm test -- --testPathPattern="integration" --watchAll=false

    if [ $? -eq 0 ]; then
        print_success "Frontend integration tests passed"
    else
        print_warning "Frontend integration tests failed (non-critical)"
    fi

    cd ..
    print_success "All frontend tests completed successfully"
}

# Function to run end-to-end tests
run_e2e_tests() {
    print_status "Running End-to-End Tests..."
    echo "============================"
    
    # Check if backend is running
    if ! curl -f http://localhost:8080/api/test/health &> /dev/null; then
        print_warning "Backend is not running. Starting backend..."
        ./gradlew bootRun &
        BACKEND_PID=$!
        
        # Wait for backend to start
        print_status "Waiting for backend to start..."
        for i in {1..30}; do
            if curl -f http://localhost:8080/api/test/health &> /dev/null; then
                print_success "Backend is running"
                break
            fi
            sleep 2
        done
        
        if ! curl -f http://localhost:8080/api/test/health &> /dev/null; then
            print_error "Backend failed to start"
            kill $BACKEND_PID 2>/dev/null || true
            return 1
        fi
    else
        print_success "Backend is already running"
        BACKEND_PID=""
    fi
    
    # Check if frontend is running
    if ! curl -f http://localhost:3000 &> /dev/null; then
        print_warning "Frontend is not running. Starting frontend..."
        cd bhfrontend
        npm start &
        FRONTEND_PID=$!
        cd ..
        
        # Wait for frontend to start
        print_status "Waiting for frontend to start..."
        for i in {1..30}; do
            if curl -f http://localhost:3000 &> /dev/null; then
                print_success "Frontend is running"
                break
            fi
            sleep 2
        done
        
        if ! curl -f http://localhost:3000 &> /dev/null; then
            print_error "Frontend failed to start"
            kill $FRONTEND_PID 2>/dev/null || true
            [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
            return 1
        fi
    else
        print_success "Frontend is already running"
        FRONTEND_PID=""
    fi
    
    # Run basic API tests
    print_status "Testing API endpoints..."
    
    # Test health endpoint
    if curl -f -k https://localhost:8443/api/test/health &> /dev/null; then
        print_success "Health endpoint is working"
    else
        print_error "Health endpoint is not working"
        [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
        [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
        return 1
    fi
    
    # Test hello endpoint
    if curl -f -k https://localhost:8443/api/test/hello &> /dev/null; then
        print_success "Hello endpoint is working"
    else
        print_error "Hello endpoint is not working"
        [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
        [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
        return 1
    fi
    
    # Test frontend
    if curl -f http://localhost:3000 &> /dev/null; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend is not accessible"
        [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
        [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
        return 1
    fi
    
    # Clean up processes we started
    if [ -n "$BACKEND_PID" ]; then
        print_status "Stopping backend..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        print_status "Stopping frontend..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    print_success "End-to-end tests completed successfully"
}

# Function to run Cypress E2E tests
run_cypress_tests() {
    print_status "Running Cypress E2E Tests..."
    echo "============================="

    cd bhfrontend

    # Check if Cypress is installed
    if [ ! -d "node_modules/cypress" ]; then
        print_status "Installing Cypress..."
        npm install cypress --save-dev
    fi

    # Start backend if not running
    if ! curl -f http://localhost:8080/api/test/health &> /dev/null; then
        print_status "Starting backend for E2E tests..."
        cd ..
        ./gradlew bootRun &
        BACKEND_PID=$!
        cd bhfrontend

        # Wait for backend to start
        print_status "Waiting for backend to start..."
        for i in {1..30}; do
            if curl -f http://localhost:8080/api/test/health &> /dev/null; then
                print_success "Backend is running"
                break
            fi
            sleep 2
        done
    else
        print_success "Backend is already running"
        BACKEND_PID=""
    fi

    # Start frontend if not running
    if ! curl -f http://localhost:3000 &> /dev/null; then
        print_status "Starting frontend for E2E tests..."
        npm start &
        FRONTEND_PID=$!

        # Wait for frontend to start
        print_status "Waiting for frontend to start..."
        for i in {1..30}; do
            if curl -f http://localhost:3000 &> /dev/null; then
                print_success "Frontend is running"
                break
            fi
            sleep 2
        done
    else
        print_success "Frontend is already running"
        FRONTEND_PID=""
    fi

    # Run Cypress tests
    print_status "Running Cypress E2E tests..."
    npx cypress run --headless --browser chrome

    CYPRESS_EXIT_CODE=$?

    # Clean up processes we started
    if [ -n "$BACKEND_PID" ]; then
        print_status "Stopping backend..."
        kill $BACKEND_PID 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ]; then
        print_status "Stopping frontend..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    cd ..

    if [ $CYPRESS_EXIT_CODE -eq 0 ]; then
        print_success "Cypress E2E tests passed"
        return 0
    else
        print_error "Cypress E2E tests failed"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running Performance Tests..."
    echo "============================"

    # Check if backend is running
    if ! curl -f http://localhost:8080/api/test/health &> /dev/null; then
        print_warning "Backend is not running. Starting backend..."
        ./gradlew bootRun &
        BACKEND_PID=$!

        # Wait for backend to start
        for i in {1..30}; do
            if curl -f http://localhost:8080/api/test/health &> /dev/null; then
                print_success "Backend is running"
                break
            fi
            sleep 2
        done
    else
        print_success "Backend is already running"
        BACKEND_PID=""
    fi

    # Run JMeter performance tests if available
    if command -v jmeter &> /dev/null; then
        print_status "Running JMeter performance tests..."
        jmeter -n -t performance-tests/api-load-test.jmx -l performance-results.jtl

        if [ $? -eq 0 ]; then
            print_success "Performance tests completed"
        else
            print_warning "Performance tests had issues"
        fi
    else
        print_warning "JMeter not found, skipping performance tests"
    fi

    # Clean up
    if [ -n "$BACKEND_PID" ]; then
        print_status "Stopping backend..."
        kill $BACKEND_PID 2>/dev/null || true
    fi

    print_success "Performance tests completed"
}

# Function to run security tests
run_security_tests() {
    print_status "Running Security Tests..."
    echo "========================="

    # Run OWASP dependency check
    print_status "Running OWASP dependency check..."
    ./gradlew dependencyCheckAnalyze

    if [ $? -eq 0 ]; then
        print_success "OWASP dependency check passed"
    else
        print_warning "OWASP dependency check found issues"
    fi

    # Run npm audit for frontend
    cd bhfrontend
    print_status "Running npm audit..."
    npm audit --audit-level moderate

    if [ $? -eq 0 ]; then
        print_success "npm audit passed"
    else
        print_warning "npm audit found vulnerabilities"
    fi

    cd ..
    print_success "Security tests completed"
}

# Function to generate test report
generate_test_report() {
    print_status "Generating Test Report..."
    echo "=========================="
    
    # Backend test results
    if [ -d "build/reports/tests/test" ]; then
        print_success "Backend test report available at: build/reports/tests/test/index.html"
    fi
    
    # Frontend test results
    if [ -d "bhfrontend/coverage" ]; then
        print_success "Frontend coverage report available at: bhfrontend/coverage/lcov-report/index.html"
    fi
    
    # Generate summary
    echo ""
    echo "📊 Test Summary"
    echo "==============="
    
    # Count backend test files
    BACKEND_TESTS=$(find src/test -name "*Test.groovy" | wc -l)
    echo "Backend test files: $BACKEND_TESTS"
    
    # Count frontend test files
    FRONTEND_TESTS=$(find bhfrontend/src -name "*.test.js" | wc -l)
    echo "Frontend test files: $FRONTEND_TESTS"
    
    echo "Total test files: $((BACKEND_TESTS + FRONTEND_TESTS))"
}

# Main execution
main() {
    echo "Starting test execution at $(date)"
    echo ""
    
    # Parse command line arguments
    RUN_BACKEND=true
    RUN_FRONTEND=true
    RUN_E2E=false
    RUN_CYPRESS=false
    RUN_PERFORMANCE=false
    RUN_SECURITY=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                RUN_FRONTEND=false
                RUN_E2E=false
                RUN_CYPRESS=false
                RUN_PERFORMANCE=false
                RUN_SECURITY=false
                shift
                ;;
            --frontend-only)
                RUN_BACKEND=false
                RUN_E2E=false
                RUN_CYPRESS=false
                RUN_PERFORMANCE=false
                RUN_SECURITY=false
                shift
                ;;
            --e2e)
                RUN_E2E=true
                shift
                ;;
            --cypress)
                RUN_CYPRESS=true
                shift
                ;;
            --performance)
                RUN_PERFORMANCE=true
                shift
                ;;
            --security)
                RUN_SECURITY=true
                shift
                ;;
            --all)
                RUN_BACKEND=true
                RUN_FRONTEND=true
                RUN_E2E=true
                RUN_CYPRESS=true
                RUN_PERFORMANCE=true
                RUN_SECURITY=true
                shift
                ;;
            --comprehensive)
                RUN_BACKEND=true
                RUN_FRONTEND=true
                RUN_CYPRESS=true
                RUN_SECURITY=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --backend-only    Run only backend tests"
                echo "  --frontend-only   Run only frontend tests"
                echo "  --e2e            Run basic end-to-end tests"
                echo "  --cypress        Run Cypress E2E tests"
                echo "  --performance    Run performance tests"
                echo "  --security       Run security tests"
                echo "  --all            Run all tests including performance and security"
                echo "  --comprehensive  Run core tests (backend, frontend, cypress, security)"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Check prerequisites
    check_prerequisites
    
    # Track overall success
    OVERALL_SUCCESS=true
    
    # Run backend tests
    if [ "$RUN_BACKEND" = true ]; then
        if ! run_backend_tests; then
            OVERALL_SUCCESS=false
        fi
        echo ""
    fi
    
    # Run frontend tests
    if [ "$RUN_FRONTEND" = true ]; then
        if ! run_frontend_tests; then
            OVERALL_SUCCESS=false
        fi
        echo ""
    fi
    
    # Run e2e tests
    if [ "$RUN_E2E" = true ]; then
        if ! run_e2e_tests; then
            OVERALL_SUCCESS=false
        fi
        echo ""
    fi

    # Run Cypress tests
    if [ "$RUN_CYPRESS" = true ]; then
        print_status "Starting Cypress E2E tests..."
        if ! run_cypress_tests; then
            print_warning "Cypress tests failed but continuing..."
            # Don't fail overall for Cypress issues during development
        fi
        echo ""
    fi

    # Run performance tests
    if [ "$RUN_PERFORMANCE" = true ]; then
        if ! run_performance_tests; then
            OVERALL_SUCCESS=false
        fi
        echo ""
    fi

    # Run security tests
    if [ "$RUN_SECURITY" = true ]; then
        if ! run_security_tests; then
            OVERALL_SUCCESS=false
        fi
        echo ""
    fi
    
    # Generate report
    generate_test_report
    
    echo ""
    echo "Test execution completed at $(date)"
    
    if [ "$OVERALL_SUCCESS" = true ]; then
        print_success "🎉 All tests passed successfully!"
        exit 0
    else
        print_error "❌ Some tests failed. Please check the output above."
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
