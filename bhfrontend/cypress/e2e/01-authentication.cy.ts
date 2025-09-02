/// <reference types="cypress" />

describe('Authentication System - Comprehensive Tests', () => {
  beforeEach(() => {
    cy.cleanDatabase();
    cy.seedDatabase('users');
    cy.visit('/');
  });

  describe('User Registration', () => {
    it('should register new user with valid data', () => {
      cy.get('[data-cy=register-btn]').click();
      
      cy.get('[data-cy=first-name-input]').type('John');
      cy.get('[data-cy=last-name-input]').type('Doe');
      cy.get('[data-cy=email-input]').type('john.doe@example.com');
      cy.get('[data-cy=password-input]').type('Password123!');
      cy.get('[data-cy=phone-input]').type('+359888123456');
      
      cy.get('[data-cy=register-submit]').click();
      
      cy.get('[data-cy=user-menu]').should('be.visible');
      cy.get('[data-cy=welcome-message]').should('contain', 'Welcome, John');
    });

    it('should validate all required fields', () => {
      cy.get('[data-cy=register-btn]').click();
      cy.get('[data-cy=register-submit]').click();
      
      cy.shouldHaveValidationError('[data-cy=first-name-input]', 'First name is required');
      cy.shouldHaveValidationError('[data-cy=last-name-input]', 'Last name is required');
      cy.shouldHaveValidationError('[data-cy=email-input]', 'Email is required');
      cy.shouldHaveValidationError('[data-cy=password-input]', 'Password is required');
      cy.shouldHaveValidationError('[data-cy=phone-input]', 'Phone is required');
    });

    it('should validate email format', () => {
      cy.get('[data-cy=register-btn]').click();
      cy.get('[data-cy=email-input]').type('invalid-email');
      cy.get('[data-cy=register-submit]').click();
      
      cy.shouldHaveValidationError('[data-cy=email-input]', 'Please enter a valid email address');
    });

    it('should validate password strength', () => {
      cy.get('[data-cy=register-btn]').click();
      cy.get('[data-cy=password-input]').type('weak');
      cy.get('[data-cy=register-submit]').click();
      
      cy.shouldHaveValidationError('[data-cy=password-input]', 'Password must be at least 8 characters');
    });

    it('should convert Bulgarian phone numbers', () => {
      cy.get('[data-cy=register-btn]').click();
      cy.get('[data-cy=phone-input]').type('0888123456');
      
      cy.get('[data-cy=phone-input]').should('have.value', '+359888123456');
    });

    it('should prevent duplicate email registration', () => {
      cy.get('[data-cy=register-btn]').click();
      
      cy.get('[data-cy=first-name-input]').type('Jane');
      cy.get('[data-cy=last-name-input]').type('Smith');
      cy.get('[data-cy=email-input]').type('customer@example.com'); // Existing email
      cy.get('[data-cy=password-input]').type('Password123!');
      cy.get('[data-cy=phone-input]').type('+359888654321');
      
      cy.get('[data-cy=register-submit]').click();
      
      cy.get('[data-cy=error-message]').should('contain', 'Email already exists');
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', () => {
      cy.get('[data-cy=login-btn]').click();
      
      cy.get('[data-cy=email-input]').type('customer@example.com');
      cy.get('[data-cy=password-input]').type('password123');
      cy.get('[data-cy=login-submit]').click();
      
      cy.get('[data-cy=user-menu]').should('be.visible');
      cy.url().should('not.include', '/login');
    });

    it('should show error for invalid credentials', () => {
      cy.get('[data-cy=login-btn]').click();
      
      cy.get('[data-cy=email-input]').type('customer@example.com');
      cy.get('[data-cy=password-input]').type('wrongpassword');
      cy.get('[data-cy=login-submit]').click();
      
      cy.get('[data-cy=error-message]').should('contain', 'Invalid credentials');
    });

    it('should validate required fields', () => {
      cy.get('[data-cy=login-btn]').click();
      cy.get('[data-cy=login-submit]').click();
      
      cy.shouldHaveValidationError('[data-cy=email-input]', 'Email is required');
      cy.shouldHaveValidationError('[data-cy=password-input]', 'Password is required');
    });

    it('should remember user session', () => {
      cy.login('customer@example.com', 'password123');
      
      // Refresh page
      cy.reload();
      
      // Should still be logged in
      cy.get('[data-cy=user-menu]').should('be.visible');
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email', () => {
      cy.get('[data-cy=login-btn]').click();
      cy.get('[data-cy=forgot-password-link]').click();
      
      cy.get('[data-cy=email-input]').type('customer@example.com');
      cy.get('[data-cy=reset-submit]').click();
      
      cy.get('[data-cy=success-message]').should('contain', 'Password reset email sent');
    });

    it('should validate email for password reset', () => {
      cy.get('[data-cy=login-btn]').click();
      cy.get('[data-cy=forgot-password-link]').click();
      
      cy.get('[data-cy=reset-submit]').click();
      
      cy.shouldHaveValidationError('[data-cy=email-input]', 'Email is required');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      cy.login('customer@example.com', 'password123');
    });

    it('should logout successfully', () => {
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-btn]').click();
      
      cy.get('[data-cy=login-btn]').should('be.visible');
      cy.get('[data-cy=user-menu]').should('not.exist');
    });
  });

  describe('Role-Based Access', () => {
    it('should show appropriate navigation for USER role', () => {
      cy.login('customer@example.com', 'password123');
      
      cy.get('[data-cy=nav-shops]').should('be.visible');
      cy.get('[data-cy=nav-appointments]').should('be.visible');
      cy.get('[data-cy=nav-dashboard]').should('not.exist');
    });

    it('should show dashboard for EMPLOYEE role', () => {
      cy.login('employee@example.com', 'password123');
      
      cy.get('[data-cy=nav-dashboard]').should('be.visible');
      cy.get('[data-cy=nav-shops]').should('be.visible');
    });

    it('should show full access for OWNER role', () => {
      cy.login('owner@example.com', 'password123');
      
      cy.get('[data-cy=nav-dashboard]').should('be.visible');
      cy.get('[data-cy=nav-shops]').should('be.visible');
      cy.get('[data-cy=nav-analytics]').should('be.visible');
    });
  });

  describe('Authentication Security', () => {
    it('should protect dashboard routes', () => {
      cy.visit('/dashboard');
      
      cy.url().should('include', '/login');
      cy.get('[data-cy=error-message]').should('contain', 'Please login to access this page');
    });

    it('should handle expired sessions', () => {
      cy.login('customer@example.com', 'password123');
      
      // Mock expired token
      cy.window().then((win) => {
        win.localStorage.setItem('auth-token', 'expired-token');
      });
      
      cy.visit('/appointments');
      
      cy.get('[data-cy=login-btn]').should('be.visible');
      cy.get('[data-cy=error-message]').should('contain', 'Session expired');
    });

    it('should prevent XSS attacks in login form', () => {
      cy.get('[data-cy=login-btn]').click();
      
      cy.get('[data-cy=email-input]').type('<script>alert("xss")</script>');
      cy.get('[data-cy=password-input]').type('password123');
      cy.get('[data-cy=login-submit]').click();
      
      // Should not execute script
      cy.on('window:alert', () => {
        throw new Error('XSS vulnerability detected');
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      cy.get('[data-cy=login-btn]').click();
      
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'email-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'password-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'login-submit');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[data-cy=login-btn]').click();
      
      cy.get('[data-cy=email-input]').should('have.attr', 'aria-label');
      cy.get('[data-cy=password-input]').should('have.attr', 'aria-label');
      cy.get('[data-cy=login-submit]').should('have.attr', 'aria-label');
    });

    it('should announce form errors to screen readers', () => {
      cy.get('[data-cy=login-btn]').click();
      cy.get('[data-cy=login-submit]').click();
      
      cy.get('[aria-live="polite"]').should('contain', 'Please fix the following errors');
    });
  });

  describe('Performance', () => {
    it('should load login form quickly', () => {
      const perf = cy.measurePerformance('login-form-load');
      
      cy.get('[data-cy=login-btn]').click();
      cy.get('[data-cy=email-input]').should('be.visible');
      
      perf.end();
    });

    it('should handle login request efficiently', () => {
      cy.get('[data-cy=login-btn]').click();
      
      const perf = cy.measurePerformance('login-request');
      
      cy.get('[data-cy=email-input]').type('customer@example.com');
      cy.get('[data-cy=password-input]').type('password123');
      cy.get('[data-cy=login-submit]').click();
      
      cy.get('[data-cy=user-menu]').should('be.visible');
      
      perf.end();
    });
  });
});
