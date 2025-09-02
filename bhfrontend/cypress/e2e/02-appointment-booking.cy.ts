/// <reference types="cypress" />

describe('Appointment Booking System - Comprehensive Tests', () => {
  beforeEach(() => {
    cy.cleanDatabase();
    cy.seedDatabase('complete-shop-data');
    
    // Mock API responses
    cy.intercept('GET', '/api/shops', { fixture: 'shops.json' }).as('getShops');
    cy.intercept('GET', '/api/shops/*/services', { fixture: 'services.json' }).as('getServices');
    cy.intercept('GET', '/api/shops/*/employees', { fixture: 'employees.json' }).as('getEmployees');
    cy.intercept('GET', '/api/availability/**', { fixture: 'available-slots.json' }).as('getAvailableSlots');
    cy.intercept('POST', '/api/appointments/lock-slot', { fixture: 'slot-lock-response.json' }).as('lockSlot');
    cy.intercept('POST', '/api/appointments', { fixture: 'appointment-created.json' }).as('createAppointment');
    
    cy.visit('/');
  });

  describe('Guest User Booking Flow', () => {
    it('should complete full booking flow as guest', () => {
      // Step 1: Browse shops
      cy.waitForApi('@getShops');
      cy.get('[data-cy=shop-card]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=shop-card]').first().click();
      
      // Step 2: Start booking
      cy.get('[data-cy=book-appointment-btn]').click();
      cy.url().should('include', '/booking');

      // Step 3: Select service
      cy.waitForApi('@getServices');
      cy.get('[data-cy=service-card]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=service-card]').first().click();
      cy.get('[data-cy=service-selected]').should('be.visible');
      cy.get('[data-cy=service-price]').should('contain', '€');
      cy.get('[data-cy=service-duration]').should('contain', 'min');
      cy.get('[data-cy=next-step-btn]').click();

      // Step 4: Select employee
      cy.waitForApi('@getEmployees');
      cy.get('[data-cy=employee-card]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=employee-card]').first().click();
      cy.get('[data-cy=employee-selected]').should('be.visible');
      cy.get('[data-cy=employee-bio]').should('be.visible');
      cy.get('[data-cy=next-step-btn]').click();

      // Step 5: Select date and time
      cy.waitForApi('@getAvailableSlots');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      cy.get(`[data-cy=date-${tomorrowStr}]`).click();
      cy.get('[data-cy=time-slot]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=time-slot]').first().click();
      
      // Verify slot locking
      cy.waitForApi('@lockSlot');
      cy.get('[data-cy=slot-locked-indicator]').should('be.visible');
      cy.get('[data-cy=lock-timer]').should('be.visible');
      cy.get('[data-cy=next-step-btn]').click();

      // Step 6: Fill guest information
      cy.get('[data-cy=guest-form]').should('be.visible');
      cy.fillGuestInfo({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+359888123456'
      });
      cy.get('[data-cy=next-step-btn]').click();

      // Step 7: Review booking
      cy.get('[data-cy=booking-summary]').should('be.visible');
      cy.get('[data-cy=summary-service]').should('contain', 'Haircut');
      cy.get('[data-cy=summary-employee]').should('be.visible');
      cy.get('[data-cy=summary-date]').should('contain', tomorrowStr);
      cy.get('[data-cy=summary-price]').should('contain', '€');
      cy.get('[data-cy=summary-customer]').should('contain', 'john.doe@example.com');

      // Step 8: Confirm booking
      cy.get('[data-cy=confirm-booking-btn]').click();
      cy.waitForApi('@createAppointment');

      // Step 9: Verify success
      cy.get('[data-cy=booking-success]').should('be.visible');
      cy.get('[data-cy=appointment-id]').should('be.visible');
      cy.get('[data-cy=appointment-details]').should('contain', 'john.doe@example.com');
      cy.get('[data-cy=calendar-link]').should('be.visible');
    });

    it('should validate guest information form', () => {
      // Navigate to guest form
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      cy.completeBookingSteps();

      // Try to proceed without filling form
      cy.get('[data-cy=next-step-btn]').click();

      // Verify validation errors
      cy.shouldHaveValidationError('[data-cy=first-name-input]', 'First name is required');
      cy.shouldHaveValidationError('[data-cy=last-name-input]', 'Last name is required');
      cy.shouldHaveValidationError('[data-cy=email-input]', 'Email is required');
      cy.shouldHaveValidationError('[data-cy=phone-input]', 'Phone is required');
    });

    it('should validate email format in guest form', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      cy.completeBookingSteps();

      cy.get('[data-cy=first-name-input]').type('John');
      cy.get('[data-cy=last-name-input]').type('Doe');
      cy.get('[data-cy=email-input]').type('invalid-email');
      cy.get('[data-cy=phone-input]').type('+359888123456');
      cy.get('[data-cy=next-step-btn]').click();

      cy.shouldHaveValidationError('[data-cy=email-input]', 'Please enter a valid email address');
    });

    it('should validate phone number format', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      cy.completeBookingSteps();

      cy.fillGuestInfo({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: 'invalid-phone'
      });
      cy.get('[data-cy=next-step-btn]').click();

      cy.shouldHaveValidationError('[data-cy=phone-input]', 'Please enter a valid phone number');
    });
  });

  describe('Authenticated User Booking Flow', () => {
    beforeEach(() => {
      cy.login('customer@example.com', 'password123');
    });

    it('should complete booking flow as authenticated user', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();

      cy.completeBookingSteps();

      // Should skip guest information step
      cy.get('[data-cy=booking-summary]').should('be.visible');
      cy.get('[data-cy=summary-customer]').should('contain', 'customer@example.com');

      cy.get('[data-cy=confirm-booking-btn]').click();
      cy.waitForApi('@createAppointment');

      cy.get('[data-cy=booking-success]').should('be.visible');
    });

    it('should prevent employee from booking at own shop', () => {
      cy.login('employee@example.com', 'password123');

      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();

      cy.get('[data-cy=employee-booking-error]')
        .should('be.visible')
        .and('contain', 'Employees cannot book appointments at their own shop');
    });

    it('should show user appointment history', () => {
      cy.visit('/appointments');

      cy.get('[data-cy=appointment-list]').should('be.visible');
      cy.get('[data-cy=appointment-card]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=appointment-status]').should('be.visible');
      cy.get('[data-cy=appointment-date]').should('be.visible');
    });
  });

  describe('Real-time Slot Management', () => {
    it('should show locked slots in real-time', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      cy.completeBookingSteps({ time: null }); // Don't select time yet

      // Mock WebSocket message for slot lock
      cy.mockWebSocketMessage('slots.shop-1.service-1.employee-1.2024-12-20', {
        action: 'LOCKED',
        shopId: 'shop-1',
        serviceId: 'service-1',
        employeeId: 'employee-1',
        dateTime: '2024-12-20T10:00:00',
        userId: 'other-user-id'
      });

      // Verify slot shows as locked
      cy.get('[data-cy=time-slot-10:00]').should('have.class', 'locked');
      cy.get('[data-cy=lock-icon-10:00]').should('be.visible');
      cy.get('[data-cy=time-slot-10:00]').should('be.disabled');
    });

    it('should show booked slots in real-time', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      cy.completeBookingSteps({ time: null });

      // Mock WebSocket message for slot booking
      cy.mockWebSocketMessage('slots.shop-1.service-1.employee-1.2024-12-20', {
        action: 'BOOKED',
        shopId: 'shop-1',
        serviceId: 'service-1',
        employeeId: 'employee-1',
        dateTime: '2024-12-20T11:00:00',
        userId: 'other-user-id'
      });

      // Verify slot is no longer available
      cy.get('[data-cy=time-slot-11:00]').should('not.exist');
    });

    it('should handle slot lock expiration', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      cy.completeBookingSteps();

      // Verify lock timer is counting down
      cy.get('[data-cy=lock-timer]').should('be.visible');
      
      // Mock lock expiration
      cy.mockWebSocketMessage('slots.shop-1.service-1.employee-1.2024-12-20', {
        action: 'UNLOCKED',
        shopId: 'shop-1',
        serviceId: 'service-1',
        employeeId: 'employee-1',
        dateTime: '2024-12-20T10:00:00'
      });

      cy.get('[data-cy=lock-expired-warning]').should('be.visible');
      cy.get('[data-cy=reselect-slot-btn]').should('be.visible');
    });
  });

  describe('Service and Employee Selection', () => {
    beforeEach(() => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
    });

    it('should display service details correctly', () => {
      cy.waitForApi('@getServices');
      
      cy.get('[data-cy=service-card]').first().within(() => {
        cy.get('[data-cy=service-name]').should('be.visible');
        cy.get('[data-cy=service-price]').should('contain', '€');
        cy.get('[data-cy=service-duration]').should('contain', 'min');
        cy.get('[data-cy=service-description]').should('be.visible');
      });
    });

    it('should filter services by category', () => {
      cy.waitForApi('@getServices');
      
      cy.get('[data-cy=service-category-filter]').select('Hair');
      cy.get('[data-cy=service-card]').should('have.length.greaterThan', 0);
      
      cy.get('[data-cy=service-category-filter]').select('Nails');
      cy.get('[data-cy=service-card]').should('have.length.greaterThan', 0);
    });

    it('should show employee availability', () => {
      cy.get('[data-cy=service-card]').first().click();
      cy.get('[data-cy=next-step-btn]').click();
      
      cy.waitForApi('@getEmployees');
      
      cy.get('[data-cy=employee-card]').first().within(() => {
        cy.get('[data-cy=employee-name]').should('be.visible');
        cy.get('[data-cy=employee-bio]').should('be.visible');
        cy.get('[data-cy=employee-experience]').should('be.visible');
        cy.get('[data-cy=employee-rating]').should('be.visible');
      });
    });

    it('should validate service selection', () => {
      cy.get('[data-cy=next-step-btn]').click();
      
      cy.get('[data-cy=validation-error]').should('contain', 'Please select a service');
    });

    it('should validate employee selection', () => {
      cy.get('[data-cy=service-card]').first().click();
      cy.get('[data-cy=next-step-btn]').click();
      cy.get('[data-cy=next-step-btn]').click();
      
      cy.get('[data-cy=validation-error]').should('contain', 'Please select an employee');
    });
  });

  describe('Date and Time Selection', () => {
    beforeEach(() => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      cy.get('[data-cy=service-card]').first().click();
      cy.get('[data-cy=next-step-btn]').click();
      cy.get('[data-cy=employee-card]').first().click();
      cy.get('[data-cy=next-step-btn]').click();
    });

    it('should display available dates', () => {
      cy.get('[data-cy=calendar]').should('be.visible');
      cy.get('[data-cy=available-date]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=unavailable-date]').should('have.class', 'disabled');
    });

    it('should load time slots for selected date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      cy.get(`[data-cy=date-${tomorrowStr}]`).click();
      cy.waitForApi('@getAvailableSlots');
      
      cy.get('[data-cy=time-slot]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=time-slot]').first().should('not.be.disabled');
    });

    it('should prevent booking in the past', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      cy.get(`[data-cy=date-${yesterdayStr}]`).should('have.class', 'disabled');
    });

    it('should respect shop operating hours', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      cy.get(`[data-cy=date-${tomorrowStr}]`).click();
      cy.waitForApi('@getAvailableSlots');
      
      // Should not show slots outside operating hours
      cy.get('[data-cy=time-slot]').each(($slot) => {
        const time = $slot.text();
        const hour = parseInt(time.split(':')[0]);
        expect(hour).to.be.at.least(9); // Shop opens at 9 AM
        expect(hour).to.be.at.most(18); // Shop closes at 6 PM
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.mockApiError('/api/shops/*/services', 500, 'Failed to load services');
      
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      
      cy.get('[data-cy=error-message]').should('contain', 'Failed to load services');
      cy.get('[data-cy=retry-btn]').should('be.visible');
    });

    it('should handle slot lock failures', () => {
      cy.mockApiError('/api/appointments/lock-slot', 400, 'Slot is already locked');
      
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      cy.completeBookingSteps();
      
      cy.get('[data-cy=slot-lock-error]').should('contain', 'Slot is already locked');
    });

    it('should handle network connectivity issues', () => {
      cy.intercept('GET', '/api/shops/*/services', { forceNetworkError: true });
      
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      
      cy.get('[data-cy=network-error]').should('be.visible');
      cy.get('[data-cy=retry-btn]').should('be.visible');
    });
  });

  describe('Accessibility and UX', () => {
    it('should be keyboard navigable', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'service-card');
      
      cy.focused().type('{enter}');
      cy.get('[data-cy=service-selected]').should('be.visible');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      
      cy.get('[data-cy=service-card]').should('have.attr', 'aria-label');
      cy.get('[data-cy=next-step-btn]').should('have.attr', 'aria-label');
    });

    it('should announce progress to screen readers', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      
      cy.get('[data-cy=service-card]').first().click();
      cy.get('[aria-live="polite"]').should('contain', 'Service selected');
    });

    it('should show booking progress', () => {
      cy.get('[data-cy=shop-card]').first().click();
      cy.get('[data-cy=book-appointment-btn]').click();
      
      cy.get('[data-cy=progress-indicator]').should('be.visible');
      cy.get('[data-cy=step-1]').should('have.class', 'active');
      
      cy.get('[data-cy=service-card]').first().click();
      cy.get('[data-cy=next-step-btn]').click();
      
      cy.get('[data-cy=step-2]').should('have.class', 'active');
    });
  });
});
