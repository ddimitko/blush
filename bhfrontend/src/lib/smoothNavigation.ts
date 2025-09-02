// Smooth navigation utilities for BeautyHub

export const smoothScrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  // Force scroll to top immediately for better UX
  window.scrollTo({
    top: 0,
    left: 0,
    behavior
  });

  // Ensure we're at the top after a short delay
  setTimeout(() => {
    if (window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
  }, 50);
};

export const smoothScrollToElement = (elementId: string, offset: number = 80) => {
  const element = document.getElementById(elementId);
  if (element) {
    const elementPosition = element.offsetTop - offset;
    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    });
  }
};

// Scroll to form top instead of page top
export const smoothScrollToForm = (formSelector: string = 'form', offset: number = 80) => {
  const form = document.querySelector(formSelector);
  if (form) {
    const formPosition = form.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: formPosition,
      behavior: 'smooth'
    });
  } else {
    // Fallback to page top if form not found
    smoothScrollToTop();
  }
};

// Scroll to a specific field within a form
export const smoothScrollToField = (fieldSelector: string, offset: number = 80) => {
  const field = document.querySelector(fieldSelector) as HTMLElement;
  if (field) {
    const fieldPosition = field.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: fieldPosition,
      behavior: 'smooth'
    });

    // Focus the field after scrolling
    setTimeout(() => {
      field.focus();
    }, 300);
  }
};

// Page transition utility
export const createPageTransition = (duration: number = 300) => {
  return new Promise<void>((resolve) => {
    // Add fade out effect
    document.body.style.opacity = '0.95';
    document.body.style.transition = `opacity ${duration}ms ease-in-out`;
    
    setTimeout(() => {
      // Reset opacity after navigation
      document.body.style.opacity = '1';
      resolve();
    }, duration);
  });
};

// Enhanced navigation with smooth transitions
export const navigateWithTransition = (
  navigate: (path: string) => void,
  path: string,
  scrollToTop: boolean = true
) => {
  // Smooth scroll to top before navigation
  if (scrollToTop) {
    smoothScrollToTop();
  }
  
  // Add subtle transition effect
  createPageTransition(200).then(() => {
    navigate(path);
  });
};

// Utility for smooth navigation between sections on the same page
export const smoothNavigateToSection = (sectionId: string, offset: number = 80) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
};

// Add loading state for navigation
export const addNavigationLoading = () => {
  const loader = document.createElement('div');
  loader.id = 'navigation-loader';
  loader.className = 'fixed top-0 left-0 w-full h-1 bg-accent-600 z-50 transition-all duration-300';
  loader.style.transform = 'scaleX(0)';
  loader.style.transformOrigin = 'left';
  
  document.body.appendChild(loader);
  
  // Animate the loader
  requestAnimationFrame(() => {
    loader.style.transform = 'scaleX(1)';
  });
  
  return () => {
    const existingLoader = document.getElementById('navigation-loader');
    if (existingLoader) {
      existingLoader.style.transform = 'scaleX(1.1)';
      existingLoader.style.opacity = '0';
      setTimeout(() => {
        existingLoader.remove();
      }, 300);
    }
  };
};

// Enhanced link component props
export interface SmoothLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  scrollToTop?: boolean;
  showLoader?: boolean;
}

// Hook for smooth navigation
export const useSmoothNavigation = () => {
  const navigate = (path: string, scrollToTop: boolean = true) => {
    if (scrollToTop) {
      smoothScrollToTop();
    }

    setTimeout(() => {
      window.location.href = path;
    }, 100);
  };

  return { navigate };
};
