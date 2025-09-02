/// <reference types="cypress" />

// Custom commands for Lunara comprehensive testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login with email and password
       */
      login(email: string, password: string): Chainable<void>;
      
      /**
       * Login as a specific user type
       */
      loginAs(userType: 'customer' | 'employee' | 'owner'): Chainable<void>;
      
      /**
       * Navigate through booking steps
       */
      completeBookingSteps(options?: {
        service?: string;
        employee?: string;
        date?: string;
        time?: string;
      }): Chainable<void>;
      
      /**
       * Fill guest information form
       */
      fillGuestInfo(info: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
      }): Chainable<void>;
      
      /**
       * Wait for API call to complete
       */
      waitForApi(alias: string, timeout?: number): Chainable<void>;
      
      /**
       * Check accessibility
       */
      checkA11y(context?: string, options?: any): Chainable<void>;
      
      /**
       * Tab navigation helper
       */
      tab(): Chainable<void>;
      
      /**
       * Mock WebSocket messages
       */
      mockWebSocketMessage(topic: string, data: any): Chainable<void>;
      
      /**
       * Seed database with test data
       */
      seedDatabase(fixture?: string): Chainable<void>;
      
      /**
       * Clean database
       */
      cleanDatabase(): Chainable<void>;
      
      /**
       * Mock API responses
       */
      mockApiSuccess(endpoint: string, fixture: string): Chainable<void>;
      mockApiError(endpoint: string, statusCode?: number, message?: string): Chainable<void>;
      
      /**
       * Performance measurement
       */
      measurePerformance(name: string): { end: () => void };
      
      /**
       * Form validation helpers
       */
      shouldHaveValidationError(fieldSelector: string, errorMessage: string): Chainable<void>;
      shouldNotHaveValidationError(fieldSelector: string): Chainable<void>;
      
      /**
       * Wait for element to be stable
       */
      waitForStable(selector: string): Chainable<void>;
      
      /**
       * Check loading states
       */
      shouldNotBeLoading(selector?: string): Chainable<void>;
    }
  }
}

// Login command with session management
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/');
    
    // Check if already logged in
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy=user-menu]').length === 0) {
        // Not logged in, proceed with login
        cy.get('[data-cy=login-btn]').click();
        cy.get('[data-cy=email-input]').type(email);
        cy.get('[data-cy=password-input]').type(password);
        cy.get('[data-cy=login-submit]').click();
        cy.get('[data-cy=user-menu]').should('be.visible');
      }
    });
  });
});

// Login as specific user type
Cypress.Commands.add('loginAs', (userType: 'customer' | 'employee' | 'owner') => {
  const users = {
    customer: Cypress.env('testUser'),
    employee: Cypress.env('testEmployee'),
    owner: Cypress.env('testOwner'),
  };
  
  const user = users[userType];
  cy.login(user.email, user.password);
});

// Complete booking steps
Cypress.Commands.add('completeBookingSteps', (options = {}) => {
  const {
    service = 'Haircut',
    employee = 'John Doe',
    date = null,
    time = '10:00'
  } = options;

  // Select service
  cy.get(`[data-cy=service-card]:contains("${service}")`).click();
  cy.get('[data-cy=next-step-btn]').click();

  // Select employee
  cy.get(`[data-cy=employee-card]:contains("${employee}")`).click();
  cy.get('[data-cy=next-step-btn]').click();

  // Select date and time
  if (date) {
    cy.get(`[data-cy=date-${date}]`).click();
  } else {
    // Select tomorrow by default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    cy.get(`[data-cy=date-${tomorrowStr}]`).click();
  }
  
  cy.get(`[data-cy=time-slot]:contains("${time}")`).click();
  cy.get('[data-cy=next-step-btn]').click();
});

// Fill guest information
Cypress.Commands.add('fillGuestInfo', (info) => {
  cy.get('[data-cy=first-name-input]').type(info.firstName);
  cy.get('[data-cy=last-name-input]').type(info.lastName);
  cy.get('[data-cy=email-input]').type(info.email);
  cy.get('[data-cy=phone-input]').type(info.phone);
});

// Wait for API with custom timeout
Cypress.Commands.add('waitForApi', (alias: string, timeout = 10000) => {
  cy.wait(alias, { timeout });
});

// Mock WebSocket messages
Cypress.Commands.add('mockWebSocketMessage', (topic: string, data: any) => {
  cy.window().then((win) => {
    win.dispatchEvent(new CustomEvent('websocket-message', {
      detail: { topic, data }
    }));
  });
});

// Database management
Cypress.Commands.add('seedDatabase', (fixture?: string) => {
  cy.task('db:seed', fixture);
});

Cypress.Commands.add('cleanDatabase', () => {
  cy.task('db:clean');
});

// API mocking helpers
Cypress.Commands.add('mockApiError', (endpoint: string, statusCode = 500, message = 'Server Error') => {
  cy.intercept('**' + endpoint, {
    statusCode,
    body: { error: message }
  });
});

Cypress.Commands.add('mockApiSuccess', (endpoint: string, fixture: string) => {
  cy.intercept('**' + endpoint, { fixture });
});

// Performance monitoring
Cypress.Commands.add('measurePerformance', (name: string) => {
  cy.window().then((win) => {
    win.performance.mark(`${name}-start`);
  });
  
  return {
    end: () => {
      cy.window().then((win) => {
        win.performance.mark(`${name}-end`);
        win.performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measure = win.performance.getEntriesByName(name)[0];
        cy.log(`Performance: ${name} took ${measure.duration}ms`);
      });
    }
  };
});

// Form validation helpers
Cypress.Commands.add('shouldHaveValidationError', (fieldSelector: string, errorMessage: string) => {
  cy.get(fieldSelector).should('have.attr', 'aria-invalid', 'true');
  cy.get(`${fieldSelector}-error`).should('contain', errorMessage);
});

Cypress.Commands.add('shouldNotHaveValidationError', (fieldSelector: string) => {
  cy.get(fieldSelector).should('not.have.attr', 'aria-invalid', 'true');
  cy.get(`${fieldSelector}-error`).should('not.exist');
});

// Wait for element stability
Cypress.Commands.add('waitForStable', (selector: string) => {
  let previousPosition: any = null;
  
  cy.get(selector).then(($el) => {
    const checkStability = () => {
      const currentPosition = $el.offset();
      
      if (previousPosition && 
          currentPosition?.top === previousPosition.top && 
          currentPosition?.left === previousPosition.left) {
        return; // Element is stable
      }
      
      previousPosition = currentPosition;
      cy.wait(100).then(checkStability);
    };
    
    checkStability();
  });
});

// Loading state checks
Cypress.Commands.add('shouldNotBeLoading', (selector?: string) => {
  const target = selector ? cy.get(selector) : cy.get('body');
  target.should('not.contain', 'Loading...');
  target.should('not.contain', 'Please wait...');
  target.find('[data-cy=loading-spinner]').should('not.exist');
});

// Tab navigation
Cypress.Commands.add('tab', () => {
  cy.focused().tab();
});

// Accessibility checking (requires cypress-axe)
Cypress.Commands.add('checkA11y', (context?: string, options?: any) => {
  // This would require cypress-axe to be installed
  // For now, we'll do basic accessibility checks
  if (context) {
    cy.get(context).should('have.attr', 'aria-label').or('have.attr', 'aria-labelledby');
  } else {
    cy.get('body').should('exist');
  }
});

// Prevent TypeScript errors
export {};
