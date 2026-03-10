import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'FniManager' || user.role === 'Controller') {
      return <Navigate to="/deals" replace />;
    }
    if (user.role === 'GeneralManager') {
      return <Navigate to="/dashboard" replace />;
    }
    if (user.role === 'BDCAgent') {
      return <Navigate to="/leads" replace />;
    }
    return <Navigate to="/vehicles" replace />;
  }

  return <>{children}</>;
}
