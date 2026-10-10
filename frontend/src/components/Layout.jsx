import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, FileText, Briefcase, Users, BarChart3,
  Bell, Search, LogOut, Menu, X, ChevronRight, Settings, Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { notificationsAPI } from '../api';
import '../layout.css';

// ── Navigation config per role ─────────────────────────────
const NAV_CONFIG = {
  student: [
    { label: 'Dashboard',       path: '/student/dashboard', Icon: LayoutDashboard },
    { label: 'My Profile',      path: '/student/profile',   Icon: User },
    { label: 'AI Resume',       path: '/student/resume',    Icon: Zap },
    { label: 'Applications',    path: '/student/applications', Icon: FileText },
  ],
  tpo: [
    { label: 'Dashboard',       path: '/tpo/dashboard',     Icon: LayoutDashboard },
    { label: 'Students',        path: '/tpo/students',      Icon: Users },
    { label: 'Jobs',            path: '/tpo/jobs',          Icon: Briefcase },
    { label: 'Reports',         path: '/tpo/reports',       Icon: BarChart3 },
  ],
  company: [
    { label: 'Job Management',  path: '/company/jobs',      Icon: Briefcase },
    { label: 'Applicants',      path: '/company/applicants',Icon: Users },
    { label: 'Profile',         path: '/company/profile',   Icon: Settings },
  ],
};

const ROLE_LABELS = { student: 'Student', tpo: 'TPO Officer', company: 'Company' };
const ROLE_COLORS = { student: '#6C47FF', tpo: '#00D4AA', company: '#FF8C42' };

// ── Avatar initials helper ──────────────────────────────────
function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// ── Notification Dropdown ───────────────────────────────────
function NotificationDropdown({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsAPI.getAll()
      .then((r) => setNotifications(r.data.slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = (id) => {
    notificationsAPI.markRead(id).then(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    });
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <span className="font-semibold text-sm">Notifications</span>
        <button
          className="text-xs text-brand"
          onClick={() => notificationsAPI.markAllRead().then(onClose)}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Mark all read
        </button>
      </div>
      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      )}
      {!loading && notifications.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          No notifications
        </div>
      )}
      {!loading && notifications.map((n) => (
        <div
          key={n.id}
          className={`notification-item ${!n.is_read ? 'unread' : ''}`}
          onClick={() => markRead(n.id)}
        >
          <div className="notification-title">{n.title}</div>
          <div className="notification-msg">{n.message}</div>
          <div className="notification-time">{new Date(n.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Layout Component ───────────────────────────────────
export default function Layout({ children }) {
  const { user, logout, isStudent, isTPO, isCompany } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifs, setShowNotifs]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const role    = user?.role || 'student';
  const navItems = NAV_CONFIG[role] || [];

  // Fetch unread notification count
  useEffect(() => {
    notificationsAPI.getAll()
      .then((r) => setUnreadCount(r.data.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    toast.info('Logged out successfully.');
    navigate('/login');
  };

  // User display name
  const displayName = user?.student_profile?.name
    || user?.company_profile?.company_name
    || user?.email?.split('@')[0]
    || 'User';

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff" />
              <path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 12l10 5 10-5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="sidebar-logo-text">CampusHire</span>
        </div>

        {/* Role badge */}
        <div style={{ padding: '12px 20px 4px' }}>
          <span
            className="badge"
            style={{
              background: `${ROLE_COLORS[role]}22`,
              color: ROLE_COLORS[role],
              fontSize: '0.7rem',
            }}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu</div>
          {navItems.map(({ label, path, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} className="sidebar-icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Logout">
            <div
              className="avatar avatar-md avatar-bg"
              style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[role]}, ${ROLE_COLORS[role]}99)` }}
            >
              {getInitials(displayName)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-role">{ROLE_LABELS[role]}</div>
            </div>
            <LogOut size={16} color="var(--color-text-muted)" />
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay show"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content ── */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="btn-icon"
              onClick={() => setSidebarOpen((p) => !p)}
              style={{ display: 'none' }}
              id="sidebar-toggle"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb / Page hint */}
            <span className="text-sm text-secondary" style={{ fontWeight: 500 }}>
              Welcome back, <span style={{ color: 'var(--color-text-primary)' }}>{displayName}</span>
            </span>
          </div>

          <div className="topbar-right">
            {/* Notification bell */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                className="topbar-btn"
                onClick={() => setShowNotifs((p) => !p)}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notification-dot" />}
              </button>
              {showNotifs && (
                <NotificationDropdown onClose={() => setShowNotifs(false)} />
              )}
            </div>

            {/* Avatar */}
            <div
              className="avatar avatar-md avatar-bg"
              style={{
                background: `linear-gradient(135deg, ${ROLE_COLORS[role]}, ${ROLE_COLORS[role]}99)`,
                cursor: 'pointer',
              }}
              title={displayName}
            >
              {getInitials(displayName)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-wrapper">
          {children}
        </main>
      </div>

      {/* Inject sidebar toggle visibility via inline style */}
      <style>{`
        @media (max-width: 1024px) {
          #sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
