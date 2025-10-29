import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';

export default function RequireAuth() {
  const { me, exp } = useAuth();
  const loc = useLocation();
  const valid = !!me && (!exp || exp > Date.now());
  return valid ? <Outlet /> : <Navigate to="/login" state={{ from: loc.pathname }} replace />;
}
