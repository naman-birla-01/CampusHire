import { useState, useEffect } from 'react';
import {
  FileText, Filter, Search, ExternalLink,
  CheckCircle, XCircle, Clock, AlertCircle, Gift,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { applicationsAPI } from '../../api';
import './StudentPortal.css';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_CONFIG = {
  applied: { label: 'Applied', cls: 'badge-info', icon: Clock },
  under_review: { label: 'Under Review', cls: 'badge-primary', icon: Clock },
  shortlisted: { label: 'Shortlisted', cls: 'badge-accent', icon: CheckCircle },
  interview_scheduled: { label: 'Interview Scheduled', cls: 'badge-warning', icon: AlertCircle },
  offered: { label: 'Offered', cls: 'badge-success', icon: Gift },
  offer_accepted: { label: 'Accepted', cls: 'badge-success', icon: CheckCircle },
  offer_declined: { label: 'Declined', cls: 'badge-danger', icon: XCircle },
  rejected: { label: 'Rejected', cls: 'badge-danger', icon: XCircle },
};

export default function StudentApplications() {
  const { user } = useAuth();
  const toast = useToast();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchApps() {
      try {
        const res = await applicationsAPI.getMyApplications();
        setApplications(res.data || []);
      } catch {
        toast.error('Failed to load applications.');
      } finally {
        setLoading(false);
      }
    }
    fetchApps();
  }, []);

  const handleRespondToOffer = async (appId, response) => {
    try {
      await applicationsAPI.respondToOffer(appId, { response });
      toast.success(`Offer ${response === 'accept' ? 'accepted' : 'declined'}!`);
      // Refresh
      const res = await applicationsAPI.getMyApplications();
      setApplications(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to respond to offer.');
    }
  };

  // Filter & search
  const filtered = applications.filter((app) => {
    if (filter !== 'all' && app.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const title = (app.job_title || '').toLowerCase();
      const company = (app.company_name || '').toLowerCase();
      if (!title.includes(q) && !company.includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: '50vh' }}>
        <div className="spinner spinner-lg" />
        <span className="text-secondary text-sm">Loading applications…</span>
      </div>
    );
  }

  return (
    <div className="student-page animate-fade-in-up">
      {/* Header */}
      <div className="welcome-row">
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>
            My Applications
          </h2>
          <p className="text-secondary" style={{ marginTop: '4px' }}>
            Track your placement journey — {applications.length} total application{applications.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="input-with-icon" style={{ maxWidth: '400px' }}>
          <Search size={16} className="input-icon" />
          <input
            className="form-input"
            placeholder="Search by job title or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="applications-filters">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`filter-chip ${filter === opt.value ? 'active' : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>
            {applications.length === 0
              ? 'You haven\'t applied to any jobs yet.'
              : 'No applications match your filter.'}
          </p>
        </div>
      ) : (
        <div className="applications-list">
          {filtered.map((app) => (
            <ApplicationListItem
              key={app.id}
              app={app}
              onRespond={handleRespondToOffer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Application List Item ────────────────────────────────── */
function ApplicationListItem({ app, onRespond }) {
  const status = STATUS_CONFIG[app.status] || {
    label: app.status || 'Unknown',
    cls: 'badge-neutral',
    icon: Clock,
  };
  const StatusIcon = status.icon;

  // Build rounds progress
  const rounds = app.rounds || [];
  const appliedDate = app.created_at
    ? new Date(app.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="application-list-item">
      <div className="app-list-header">
        <div>
          <div className="app-title">{app.job_title || 'Position'}</div>
          <div className="app-company">{app.company_name || 'Company'}</div>
        </div>
        <span className={`badge ${status.cls}`}>
          <StatusIcon size={12} />
          {status.label}
        </span>
      </div>

      {/* Meta info */}
      <div className="app-list-meta">
        <div className="app-meta-item">
          Applied: <span>{appliedDate}</span>
        </div>
        {app.location && (
          <div className="app-meta-item">
            Location: <span>{app.location}</span>
          </div>
        )}
        {app.package_lpa && (
          <div className="app-meta-item">
            Package: <span>{app.package_lpa} LPA</span>
          </div>
        )}
      </div>

      {/* Round progress */}
      {rounds.length > 0 && (
        <div className="round-progress">
          {rounds.map((round, i) => {
            const isPassed = round.result === 'passed';
            const isCurrent = round.result === 'pending' && (i === 0 || rounds[i - 1]?.result === 'passed');
            const isFailed = round.result === 'failed';
            return (
              <div key={round.id || i} style={{ display: 'contents' }}>
                {i > 0 && (
                  <div className={`round-connector ${isPassed || isCurrent ? 'passed' : ''}`} />
                )}
                <div className="round-step">
                  <div
                    className={`round-dot ${
                      isPassed ? 'passed' : isCurrent ? 'current' : isFailed ? 'failed' : ''
                    }`}
                  />
                  <span
                    className={`round-label ${
                      isPassed ? 'passed' : isCurrent ? 'current' : ''
                    }`}
                  >
                    {round.name || `Round ${i + 1}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Offer Response Buttons */}
      {app.status === 'offered' && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onRespond(app.id, 'accept')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle size={14} /> Accept Offer
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onRespond(app.id, 'decline')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <XCircle size={14} /> Decline
          </button>
        </div>
      )}
    </div>
  );
}
