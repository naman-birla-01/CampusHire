import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute — Guards a route by role.
 * Redirects to /login if not authenticated.
 * Redirects to role's home if authenticated with wrong role.
 *
 * @param {string} role  — required role: 'student' | 'tpo' | 'company'
 * @param {ReactNode} children
 */
export function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
        <span className="text-secondary text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    // Redirect to appropriate home
    const home = { student: '/student/dashboard', tpo: '/tpo/dashboard', company: '/company/jobs' };
    return <Navigate to={home[user.role] || '/login'} replace />;
  }

  return children;
}

/**
 * PublicOnlyRoute — Redirects already-authenticated users away from login/register.
 */
export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (user) {
    const home = { student: '/student/dashboard', tpo: '/tpo/dashboard', company: '/company/jobs' };
    return <Navigate to={home[user.role] || '/'} replace />;
  }

  return children;
}
