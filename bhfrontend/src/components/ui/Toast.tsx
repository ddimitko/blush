import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  id?: string;
  dismissible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

interface ToastContextType {
  success: (title: string, description?: string, options?: ToastOptions) => string | number;
  error: (title: string, description?: string, options?: ToastOptions) => string | number;
  warning: (title: string, description?: string, options?: ToastOptions) => string | number;
  info: (title: string, description?: string, options?: ToastOptions) => string | number;
  loading: (title: string, description?: string) => string | number;
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => any;
  dismiss: (id?: string | number) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  // Enhanced success toast with better styling and options
  const success = useCallback((title: string, description?: string, options?: ToastOptions) => {
    return toast.success(title, {
      description,
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      duration: options?.duration || 5000,
      id: options?.id,
      dismissible: options?.dismissible !== false,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options?.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
    });
  }, []);

  // Enhanced error toast with longer duration and better styling
  const error = useCallback((title: string, description?: string, options?: ToastOptions) => {
    return toast.error(title, {
      description,
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      duration: options?.duration || 8000, // Longer for errors
      id: options?.id,
      dismissible: options?.dismissible !== false,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options?.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
    });
  }, []);

  // Enhanced warning toast with Lunara gold accent
  const warning = useCallback((title: string, description?: string, options?: ToastOptions) => {
    return toast.warning(title, {
      description,
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      duration: options?.duration || 6000,
      id: options?.id,
      dismissible: options?.dismissible !== false,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options?.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
    });
  }, []);

  // Enhanced info toast
  const info = useCallback((title: string, description?: string, options?: ToastOptions) => {
    return toast.info(title, {
      description,
      icon: <Info className="w-5 h-5 text-blue-600" />,
      duration: options?.duration || 5000,
      id: options?.id,
      dismissible: options?.dismissible !== false,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options?.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
    });
  }, []);

  // Loading toast for async operations
  const loading = useCallback((title: string, description?: string) => {
    return toast.loading(title, {
      description,
      duration: Infinity, // Loading toasts don't auto-dismiss
    });
  }, []);

  // Promise toast for handling async operations with automatic state updates
  const promise = useCallback(<T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
    });
  }, []);

  // Dismiss specific toast
  const dismiss = useCallback((id?: string | number) => {
    toast.dismiss(id);
  }, []);

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);

  return (
    <ToastContext.Provider value={{
      success,
      error,
      warning,
      info,
      loading,
      promise,
      dismiss,
      dismissAll
    }}>
      {children}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
