# CSRF Configuration Documentation

## Overview

Cross-Site Request Forgery (CSRF) protection is implemented throughout the Lunara application to prevent malicious websites from performing unauthorized actions on behalf of authenticated users.

## Configuration

### Backend Configuration

The CSRF configuration is defined in `SecurityConfig.groovy`:

```groovy
.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
    .ignoringRequestMatchers(
        // Authentication endpoints (stateless JWT)
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/refresh",
        "/api/auth/refresh-current", // Current user token refresh
        "/api/auth/logout",
        "/api/auth/csrf", // CSRF token endpoint
        "/api/auth/oauth2/**",
        
        // Webhook endpoints (external services)
        "/api/payments/webhook",
        "/api/subscriptions/webhook", 
        "/api/webhooks/**",
        
        // Public endpoints (no authentication required)
        "/api/public/**",
        "/api/employee-invitations/**",
        "/api/i18n/**", // Internationalization endpoints

        // Password reset endpoints (public, stateless)
        "/api/auth/forgot-password",
        "/api/auth/reset-password",

        // Guest appointment booking endpoints
        "/api/appointments",
        "/api/appointments/available-slots",
        "/api/appointments/guest-appointments",
        "/api/appointments/lock-slot",
        "/api/appointments/unlock-slot",
        "/api/payments/create-payment-intent",
        "/api/payments/confirm-payment-intent",
        
        // Stripe integration endpoints
        "/api/subscriptions/setup-intent",
        "/api/subscriptions/confirm-setup-and-create-shop",
        "/api/stripe/connect/**",
        "/api/stripe/tax/**",
        "/api/stripe/publishable-key",

        // User payment methods
        "/api/user/payment-methods/**",

        // User favorites
        "/api/favorites/**",

        // Public shop endpoints
        "/api/shops/search",
        "/api/shops/business-types",
        "/api/shops/*/services",
        "/api/shops/*/ratings",

        // Public subscription plans
        "/api/subscription-plans",
        "/api/subscription-plans/**",

        // Admin setup endpoints
        "/api/admin/setup/**",

        // Static file serving
        "/uploads/**",
        "/api/uploads/**",

        // Monitoring endpoints
        "/actuator/**",

        // WebSocket endpoints
        "/ws/**",
        "/ws-notifications/**",
        "/stomp/**",

        // Development/Test endpoints
        "/api/test/**",
        "/api/test-data/**",
        "/api/websocket/**"
    )
)
```

### Frontend Configuration

The frontend automatically handles CSRF tokens through the `ApiClient` class:

- **Smart Token Detection**: Only adds CSRF tokens to state-changing requests (POST, PUT, DELETE, PATCH)
- **Token Validation**: Validates token format and length before use
- **Automatic Retry**: Automatically retries requests with fresh CSRF tokens on 403 errors
- **Token Refresh**: Tokens are refreshed as needed via `/api/auth/csrf`
- **Error Recovery**: Handles CSRF-related errors gracefully with automatic recovery

#### 2. React Hook for CSRF Management

The `useCsrf` hook provides comprehensive CSRF token management:

```typescript
import { useCsrf } from '../hooks/useCsrf';

const MyComponent = () => {
  const {
    token,              // Current CSRF token
    isLoading,          // Loading state
    error,              // Error state
    isTokenAvailable,   // Check if token exists
    refreshToken,       // Manually refresh token
    ensureToken,        // Ensure token is available
    getCsrfHeaders,     // Get headers for manual requests
    validateCsrfProtection // Test CSRF protection
  } = useCsrf();

  // Component logic...
};
```

#### 3. Higher-Order Component Protection

Protect sensitive components with automatic CSRF validation:

```typescript
import { withCsrfProtection, withStrictCsrfProtection } from '../components/hoc/withCsrfProtection';

// Basic protection (ensures token is available)
const ProtectedComponent = withCsrfProtection(MyComponent);

// Strict protection (validates CSRF is working)
const StrictlyProtectedComponent = withStrictCsrfProtection(MyComponent);
```

#### 4. Debug Components

For development and troubleshooting:

```typescript
import CsrfDebug from '../components/debug/CsrfDebug';

// Add to your development UI
{process.env.NODE_ENV === 'development' && <CsrfDebug />}
```

## CSRF-Protected Endpoints

All authenticated state-changing operations require CSRF tokens:

### User Management
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/avatar` - Upload user avatar
- `PUT /api/user/change-password` - Change password
- `PUT /api/user/complete-onboarding` - Complete onboarding

### Shop Management
- `POST /api/shops` - Create shop
- `PUT /api/shops/{id}` - Update shop
- `POST /api/shops/{id}/images` - Upload shop images
- `POST /api/shops/{id}/gallery` - Upload gallery images
- `DELETE /api/shops/{id}/gallery` - Delete gallery images
- `PUT /api/shops/{id}/thumbnail` - Set shop thumbnail

### Employee Management
- `POST /api/employees/shops/{shopId}/create` - Create employee
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Delete employee
- `POST /api/employees/shops/{shopId}/invite` - Invite employee

### Service Management
- `POST /api/services` - Create service
- `PUT /api/services/{id}` - Update service
- `DELETE /api/services/{id}` - Delete service

### Appointment Management
- `PUT /api/appointments/{id}` - Update appointment
- `PUT /api/appointments/{id}/status` - Update appointment status
- `PUT /api/appointments/{id}/cancel` - Cancel appointment
- `POST /api/appointments/{id}/refund` - Refund appointment

### Schedule Management
- `POST /api/schedules/employee/{id}` - Update employee schedule
- `DELETE /api/schedules/slot/{id}` - Delete schedule slot

### Subscription Management
- `POST /api/subscriptions/shops/{shopId}` - Create subscription
- `PUT /api/subscriptions/shops/{shopId}` - Update subscription
- `DELETE /api/subscriptions/shops/{shopId}` - Cancel subscription

### Stripe Connect
- `POST /api/stripe/connect/accounts/{shopId}` - Create Connect account
- `PUT /api/stripe/connect/accounts/{shopId}` - Update Connect account
- `POST /api/stripe/connect/accounts/{shopId}/submit` - Submit for review

### Notifications
- `PUT /api/notifications/{id}/read` - Mark notification as read
- `PUT /api/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/notifications/clear-all` - Clear all notifications

### Leave Requests
- `POST /api/leave-requests/employee/{id}` - Create leave request
- `PUT /api/leave-requests/{id}/employee/{employeeId}` - Update leave request
- `POST /api/leave-requests/{id}/review` - Review leave request

## CSRF-Excluded Endpoints

The following endpoints are excluded from CSRF protection:

### Authentication (Stateless JWT)
- All `/api/auth/**` endpoints
- OAuth2 endpoints

### Webhooks (External Services)
- Stripe payment webhooks
- Stripe subscription webhooks
- General webhook endpoints

### Public Endpoints
- Shop search and browsing
- Public shop information
- Employee invitation handling

### Guest Booking
- Guest appointment creation
- Slot locking/unlocking
- Payment intent creation

### Development/Testing
- Test endpoints (dev/test profiles only)
- WebSocket endpoints

## Frontend Implementation

### Enhanced CSRF Implementation

The application now includes comprehensive CSRF protection with multiple layers:

#### 1. Automatic CSRF Handling

The `ApiClient` class automatically handles CSRF tokens:

```typescript
// Request interceptor adds CSRF token
this.client.interceptors.request.use((config) => {
  const csrfToken = this.getCsrfToken();
  if (csrfToken) {
    config.headers['X-CSRF-TOKEN'] = csrfToken;
  }
  return config;
});

// Ensure CSRF token before protected operations
async ensureCsrfToken(): Promise<void> {
  const existingToken = this.getCsrfToken();
  if (existingToken) {
    return;
  }
  
  try {
    await this.client.get('/auth/csrf');
  } catch (error) {
    console.warn('Failed to get CSRF token:', error);
  }
}
```

### Manual CSRF Token Usage

For state-changing operations, the frontend calls `ensureCsrfToken()`:

```typescript
async createShop(shopData: ShopCreationRequest): Promise<any> {
  await this.ensureCsrfToken();
  const response = await this.client.post('/shops', shopData);
  return response.data;
}
```

## Testing

CSRF configuration is tested in `CsrfConfigurationTest.groovy`:

- Verifies excluded endpoints work without CSRF tokens
- Confirms protected endpoints require CSRF tokens
- Tests CSRF token retrieval endpoint
- Validates cookie-based token delivery

## Security Considerations

1. **Cookie Configuration**: CSRF tokens are stored in cookies with `httpOnly=false` to allow JavaScript access
2. **SameSite Policy**: Cookies should use `SameSite=Strict` in production
3. **HTTPS Only**: CSRF cookies should be marked `Secure` in production
4. **Token Rotation**: Tokens are rotated on each request for enhanced security

## Troubleshooting

### Common Issues

1. **403 Forbidden on Protected Endpoints**
   - Ensure CSRF token is included in requests
   - Check that the endpoint is not accidentally excluded
   - Verify cookie is being set correctly

2. **CSRF Token Not Available**
   - Call `/api/auth/csrf` to obtain a token
   - Check browser cookie storage
   - Verify CORS configuration allows credentials

3. **Token Mismatch Errors**
   - Clear browser cookies and obtain a new token
   - Check for token expiration
   - Verify token is being sent in correct header

### Debug Steps

1. Check browser developer tools for `XSRF-TOKEN` cookie
2. Verify `X-CSRF-TOKEN` header in network requests
3. Review server logs for CSRF-related errors
4. Test with curl including CSRF token manually
