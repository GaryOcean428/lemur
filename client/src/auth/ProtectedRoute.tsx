/**
 * Protected Route Component
 * 
 * Chain of Draft: Props → Check Auth → Redirect → UI → Optimization
 * 
 * A higher-order component that restricts route access based on authentication
 * state and user roles, providing a secure application navigation flow.
 */
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  /** Required roles to access this route (empty = any authenticated user) */
  requiredRoles?: string[];
  
  /** Redirect path for unauthenticated users */
  redirectPath?: string;
  
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  
  /** Optional children instead of using Outlet */
  children?: React.ReactNode;
}

/**
 * Protected Route Component
 * 
 * Secures routes based on authentication state and user roles.
 * Redirects unauthenticated users to signin page with return URL.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredRoles = [],
  redirectPath = '/signin',
  loadingComponent = <div>Loading authentication...</div>,
  children,
}) => {
  // Get authentication state
  const { currentUser, userLoading, userRoles, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Show loading state if authentication is still being determined
  if (userLoading) {
    return <>{loadingComponent}</>;
  }
  
  // Check if user has required roles (if specified)
  const hasRequiredRoles = requiredRoles.length === 0 || 
    requiredRoles.some(role => userRoles.includes(role));
  
  // Redirect unauthenticated or unauthorized users
  if (!isAuthenticated || (requiredRoles.length > 0 && !hasRequiredRoles)) {
    // Include the attempted URL as return path
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${redirectPath}?returnUrl=${returnUrl}`} replace />;
  }

  // Render children or Outlet (for React Router v6)
  return <>{children || <Outlet />}</>;
};

/**
 * Admin Only Route
 * 
 * A specialized version of protected route that only allows users with admin role
 */
export const AdminRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRoles'>> = (props) => {
  return <ProtectedRoute {...props} requiredRoles={['admin']} />;
};

export default ProtectedRoute;
