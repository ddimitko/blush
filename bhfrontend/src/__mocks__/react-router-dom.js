const React = require('react');

// Mock react-router-dom for testing
const reactRouterDom = {
  // Router components
  BrowserRouter: ({ children }) => React.createElement('div', { 'data-testid': 'browser-router' }, children),
  Router: ({ children }) => React.createElement('div', { 'data-testid': 'router' }, children),
  Routes: ({ children }) => React.createElement('div', { 'data-testid': 'routes' }, children),
  Route: ({ children }) => React.createElement('div', { 'data-testid': 'route' }, children),
  
  // Navigation components
  Link: ({ children, to, ...props }) => 
    React.createElement('a', { 
      href: to, 
      'data-testid': 'router-link',
      ...props 
    }, children),
  
  NavLink: ({ children, to, className, ...props }) => 
    React.createElement('a', { 
      href: to, 
      className: typeof className === 'function' ? className({ isActive: false }) : className,
      'data-testid': 'router-navlink',
      ...props 
    }, children),
  
  // Hooks
  useNavigate: () => jest.fn(),
  useLocation: () => ({ 
    pathname: '/', 
    search: '', 
    hash: '', 
    state: null,
    key: 'default'
  }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useMatch: () => null,
  useResolvedPath: (to) => ({ pathname: to, search: '', hash: '' }),
  
  // Navigation functions
  Navigate: ({ to, replace }) => {
    React.useEffect(() => {
      // Mock navigation effect
    }, [to, replace]);
    return null;
  },
  
  // Outlet
  Outlet: () => React.createElement('div', { 'data-testid': 'outlet' }),
  
  // Memory router for testing
  MemoryRouter: ({ children, initialEntries = ['/'] }) => 
    React.createElement('div', { 
      'data-testid': 'memory-router',
      'data-initial-entries': JSON.stringify(initialEntries)
    }, children),
  
  // Create browser router
  createBrowserRouter: () => ({
    navigate: jest.fn(),
    location: { pathname: '/' }
  }),
  
  // Router provider
  RouterProvider: ({ router, children }) => 
    React.createElement('div', { 'data-testid': 'router-provider' }, children)
};

module.exports = reactRouterDom;
