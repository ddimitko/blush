interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string;
  interactive?: boolean;
  navigationPath?: string;
  waitForNavigation?: boolean;
  subTutorial?: TutorialStep[];
}

export const getOwnerTutorialSteps = (shopId?: string): TutorialStep[] => [
  {
    id: 'welcome',
    title: 'Welcome to Your Owner Dashboard! 🎉',
    description: 'This is your central hub for managing your beauty business. Let\'s explore all the features that will help you succeed.',
    position: 'center'
  },
  {
    id: 'shop-selector',
    title: 'Shop Selection',
    description: 'If you own multiple shops, use this dropdown in the navbar to switch between them. All dashboard data will update to show information for the selected shop.',
    target: '.shop-selector',
    position: 'bottom'
  },
  {
    id: 'setup-banners',
    title: 'Setup Progress',
    description: 'These banners guide you through essential setup steps like subscription activation and payment setup. Complete these to make your shop visible to customers.',
    target: '[data-tutorial="setup-banners"], .setup-banners',
    position: 'bottom'
  },
  {
    id: 'stats-overview',
    title: 'Business Overview',
    description: 'Get a quick snapshot of your business performance including appointments, revenue, and employee count for the current month.',
    target: '[data-tutorial="stats-overview"], .stats-overview',
    position: 'bottom'
  },
  {
    id: 'calendar',
    title: 'Appointment Calendar',
    description: 'View all your shop\'s appointments in a calendar format. Click on any date to see detailed appointments for that day.',
    target: '.appointment-calendar, [class*="calendar"], .lg\\:col-span-2',
    position: 'right'
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions Hub',
    description: 'Access the most important management features quickly. These buttons provide fast access to employee management, services, analytics, schedules, and settings.',
    target: '[data-tutorial="quick-actions"], .quick-actions',
    position: 'left'
  },
  {
    id: 'employees-interactive',
    title: 'Employee Management',
    description: 'Manage your team members, their schedules, and permissions. Click "Manage Employees" to see the employee management features.',
    target: '.quick-actions',
    position: 'left',
    action: 'Click "Manage Employees" to explore employee management features',
    interactive: true,
    navigationPath: shopId ? `/shop/${shopId}/employees` : '/shop/employees',
    subTutorial: [
      {
        id: 'employee-overview',
        title: 'Employee Management Overview',
        description: 'This is your employee management hub. Here you can invite new team members, manage existing employees, and track their performance.',
        position: 'center'
      },
      {
        id: 'employee-list',
        title: 'Employee List',
        description: 'Here you can see all your employees, their roles, and current status. Active employees are shown with their key information including contact details and hire dates.',
        target: '.employee-list, .employees-grid, .employee-card',
        position: 'top'
      },
      {
        id: 'add-employee',
        title: 'Add New Employee',
        description: 'Click this button to invite new employees to your shop. You can set their role, permissions, and initial details. They\'ll receive an email invitation to join.',
        target: '.add-employee-btn, [data-testid="add-employee"], .btn-primary',
        position: 'bottom',
        action: 'Try clicking "Add Employee" to see the invitation form',
        interactive: true
      },
      {
        id: 'employee-actions',
        title: 'Employee Actions',
        description: 'Each employee has action buttons for editing their details, managing their schedule, viewing their performance, or removing them from your team.',
        target: '.employee-actions, .action-buttons, .employee-menu',
        position: 'left'
      },
      {
        id: 'employee-filters',
        title: 'Filter & Search',
        description: 'Use these filters to find specific employees by role (Owner, Employee), status (Active, Inactive), or search by name.',
        target: '.employee-filters, .search-input, .filter-buttons',
        position: 'bottom'
      },
      {
        id: 'employee-performance',
        title: 'Performance Tracking',
        description: 'Monitor each employee\'s performance including appointment count, revenue generated, customer ratings, and attendance.',
        target: '.performance-metrics, .employee-stats',
        position: 'right'
      }
    ]
  },
  {
    id: 'services-interactive',
    title: 'Service Management',
    description: 'Create and manage the services your shop offers. Set prices, durations, and assign employees to each service.',
    target: '.quick-actions',
    position: 'left',
    action: 'Click "Manage Services" to explore service management features',
    interactive: true,
    navigationPath: shopId ? `/shop/${shopId}/services` : '/shop/services',
    subTutorial: [
      {
        id: 'service-overview',
        title: 'Service Management Overview',
        description: 'This is where you create and manage all the services your shop offers. Customers will see these services when booking appointments.',
        position: 'center'
      },
      {
        id: 'service-list',
        title: 'Service Catalog',
        description: 'View all your services with their prices, durations, and assigned employees. Each service card shows key information that customers see when booking.',
        target: '.service-list, .services-grid, .service-card',
        position: 'top'
      },
      {
        id: 'add-service',
        title: 'Create New Service',
        description: 'Add new services to your catalog. Set pricing, duration, description, and assign qualified employees who can perform this service.',
        target: '.add-service-btn, [data-testid="add-service"], .btn-primary',
        position: 'bottom',
        action: 'Click "Add Service" to see the service creation form',
        interactive: true
      },
      {
        id: 'service-categories',
        title: 'Service Categories',
        description: 'Organize your services into categories like "Hair", "Nails", "Skincare", "Massage" for better customer navigation and easier management.',
        target: '.service-categories, .category-filter, .category-tabs',
        position: 'left'
      },
      {
        id: 'service-pricing',
        title: 'Pricing Management',
        description: 'Set competitive prices for each service. You can also create special pricing tiers or discounts for different customer groups.',
        target: '.service-pricing, .price-display, .pricing-section',
        position: 'right'
      },
      {
        id: 'service-employees',
        title: 'Employee Assignment',
        description: 'Assign qualified employees to each service. Only assigned employees will be available for booking when customers select this service.',
        target: '.service-employees, .employee-assignment, .assigned-staff',
        position: 'bottom'
      },
      {
        id: 'service-duration',
        title: 'Service Duration',
        description: 'Set accurate durations for each service. This affects appointment scheduling and helps prevent overbooking.',
        target: '.service-duration, .duration-input, .time-settings',
        position: 'top'
      }
    ]
  },
  {
    id: 'analytics-interactive',
    title: 'Business Analytics',
    description: 'Track your business performance with detailed analytics and reports.',
    target: '.quick-actions',
    position: 'left',
    action: 'Click "View Analytics" to explore business insights',
    interactive: true,
    navigationPath: shopId ? `/shop/${shopId}/analytics` : '/shop/analytics',
    subTutorial: [
      {
        id: 'analytics-overview',
        title: 'Analytics Dashboard',
        description: 'Welcome to your business analytics dashboard. Here you can track revenue, monitor performance, and make data-driven decisions.',
        position: 'center'
      },
      {
        id: 'revenue-charts',
        title: 'Revenue Analytics',
        description: 'Track your revenue trends over time, identify peak earning periods, and see which services generate the most income.',
        target: '.revenue-charts, .revenue-graph, .earnings-chart',
        position: 'top'
      },
      {
        id: 'appointment-metrics',
        title: 'Appointment Metrics',
        description: 'Monitor booking rates, cancellation patterns, no-show rates, and customer retention metrics to optimize your operations.',
        target: '.appointment-metrics, .booking-stats, .appointment-analytics',
        position: 'bottom'
      },
      {
        id: 'employee-performance',
        title: 'Employee Performance',
        description: 'See which employees are performing best, track their revenue generation, and identify training opportunities or top performers.',
        target: '.employee-performance, .staff-analytics, .performance-metrics',
        position: 'left'
      },
      {
        id: 'customer-insights',
        title: 'Customer Insights',
        description: 'Understand your customer base with demographics, booking patterns, and loyalty metrics.',
        target: '.customer-insights, .customer-analytics, .client-metrics',
        position: 'right'
      },
      {
        id: 'service-popularity',
        title: 'Service Performance',
        description: 'See which services are most popular, profitable, and in-demand to optimize your service offerings.',
        target: '.service-analytics, .service-performance, .popular-services',
        position: 'bottom'
      },
      {
        id: 'time-analysis',
        title: 'Time & Scheduling Analysis',
        description: 'Analyze peak hours, busy days, and optimal scheduling patterns to maximize your shop\'s efficiency.',
        target: '.time-analysis, .schedule-analytics, .peak-hours',
        position: 'top'
      }
    ]
  },
  {
    id: 'settings-interactive',
    title: 'Shop Settings',
    description: 'Configure your shop details, business hours, subscription, and payment settings.',
    target: '.settings-btn',
    position: 'bottom',
    action: 'Click "Settings" to explore shop configuration options',
    interactive: true,
    navigationPath: shopId ? `/shop/${shopId}/settings` : '/shop/settings',
    subTutorial: [
      {
        id: 'settings-overview',
        title: 'Shop Settings Overview',
        description: 'This is your shop configuration center. Here you can update all aspects of your shop setup and preferences.',
        position: 'center'
      },
      {
        id: 'shop-details',
        title: 'Shop Information',
        description: 'Update your shop name, description, contact information, address, and location details. This information is visible to customers.',
        target: '.shop-details, .shop-info, .basic-settings',
        position: 'top'
      },
      {
        id: 'business-hours',
        title: 'Business Hours',
        description: 'Set your operating hours for each day of the week. This affects when customers can book appointments and determines your availability.',
        target: '.business-hours, .operating-hours, .schedule-settings',
        position: 'bottom'
      },
      {
        id: 'payment-settings',
        title: 'Payment Configuration',
        description: 'Set up Stripe Connect for accepting payments, configure payment methods, and manage transaction settings.',
        target: '.payment-settings, .stripe-settings, .payment-config',
        position: 'left'
      },
      {
        id: 'subscription-management',
        title: 'Subscription Management',
        description: 'Manage your Lunara subscription plan, view billing information, and upgrade or downgrade your plan.',
        target: '.subscription-settings, .billing-info, .plan-management',
        position: 'right'
      },
      {
        id: 'notification-settings',
        title: 'Notification Preferences',
        description: 'Configure how you want to receive notifications about appointments, cancellations, and other important events.',
        target: '.notification-settings, .alert-preferences, .email-settings',
        position: 'top'
      },
      {
        id: 'booking-settings',
        title: 'Booking Configuration',
        description: 'Set booking rules like advance notice requirements, cancellation policies, and deposit requirements.',
        target: '.booking-settings, .appointment-rules, .booking-config',
        position: 'bottom'
      },
      {
        id: 'staff-permissions',
        title: 'Staff Permissions',
        description: 'Configure what permissions different employee roles have in your shop management system.',
        target: '.staff-permissions, .role-settings, .permission-config',
        position: 'left'
      }
    ]
  },
  {
    id: 'notifications',
    title: 'Notification Center',
    description: 'Stay updated with appointment notifications, employee requests, and system alerts. Check the bell icon in the navbar.',
    target: '.notification-bell',
    position: 'bottom'
  },
  {
    id: 'profile-menu',
    title: 'Profile & Account',
    description: 'Access your profile settings, account preferences, and logout options from the navbar.',
    target: '.profile-menu',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! ✨',
    description: 'You now know how to use all the key features of your owner dashboard. Start by completing your shop setup to go live and attract customers!',
    position: 'center'
  }
];

export const ownerTutorialSteps = getOwnerTutorialSteps();

export const employeeTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Employee Dashboard! 👋',
    description: 'This is your workspace for managing your schedule, tracking performance, and providing excellent service to customers.',
    position: 'center'
  },
  {
    id: 'performance-stats',
    title: 'Your Performance Overview',
    description: 'See your key performance metrics including total appointments, revenue generated, average rating, and upcoming appointments.',
    target: '.performance-stats',
    position: 'bottom'
  },
  {
    id: 'calendar',
    title: 'Your Appointment Calendar',
    description: 'View all your scheduled appointments in a calendar format. Click on any date to see detailed appointments for that day.',
    target: '.appointment-calendar',
    position: 'right'
  },
  {
    id: 'daily-schedule',
    title: 'Today\'s Schedule',
    description: 'When you select a date, you\'ll see detailed appointment information here including customer details and service information.',
    target: '.daily-appointments',
    position: 'left'
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Access important features quickly: view your performance metrics, edit your profile, and request time off.',
    target: '.quick-actions',
    position: 'left'
  },
  {
    id: 'performance-interactive',
    title: 'Performance Tracking',
    description: 'Monitor your detailed performance metrics, customer feedback, and earnings over time.',
    target: '.quick-actions',
    position: 'left',
    action: 'Click "View Performance" to explore your detailed metrics',
    interactive: true,
    navigationPath: '/employee/performance'
  },
  {
    id: 'profile-interactive',
    title: 'Your Profile',
    description: 'Update your bio, specialties, experience, and other profile information that customers can see when booking.',
    target: '.quick-actions',
    position: 'left',
    action: 'Click "Edit Profile" to update your information',
    interactive: true,
    navigationPath: '/employee/profile'
  },
  {
    id: 'leave-request-interactive',
    title: 'Request Time Off',
    description: 'Submit leave requests for vacation, sick days, or personal time. Your manager will review and approve requests.',
    target: '.quick-actions',
    position: 'left',
    action: 'Click "Request Leave" to submit a time-off request',
    interactive: true,
    navigationPath: '/employee/leave'
  },
  {
    id: 'appointments',
    title: 'Managing Appointments',
    description: 'You can view appointment details, add notes, and see customer information. Remember, customers book appointments with you through the shop\'s public page.',
    target: '.appointment-details',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re Ready to Go! 🌟',
    description: 'You now know how to use your employee dashboard effectively. Focus on providing excellent service and building great customer relationships!',
    position: 'center'
  }
];
