import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, CheckCircle, XCircle, Gift,
  X, Sparkles, Briefcase, ChevronRight, Download,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { jobsAPI, applicationsAPI } from '../../api';
import './CompanyPortal.css';

/* ─── Helpers ─────────────────────────────────────────────────── */
function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function getMatchClass(score) {
  if (!score) return '';
  if (score >= 75) return '';
  if (score >= 50) return 'medium';
  return 'low';
}

function getRoundState(rounds = [], roundIdx) {
  if (!rounds[roundIdx]) return 'pending';
  const r = rounds[roundIdx];
  if (r.result === 'passed') return 'passed';
  if (r.result === 'failed') return 'failed';
  return 'current';
}

const APP_STATUS_CONFIG = {
  applied:              { label: 'Applied',              cls: 'badge-draft' },
  under_review:         { label: 'Under Review',         cls: 'badge-draft' },
  shortlisted:          { label: 'Shortlisted',          cls: 'badge-accepted' },
  interview_scheduled:  { label: 'Interview Scheduled',  cls: 'badge-offered' },
  offered:              { label: 'Offered',              cls: 'badge-offered' },
  offer_accepted:       { label: 'Offer Accepted',       cls: 'badge-accepted' },
  offer_declined:       { label: 'Offer Declined',       cls: 'badge-closed' },
  rejected:             { label: 'Rejected',             cls: 'badge-closed' },
};

/* ─── Offer Modal ─────────────────────────────────────────────── */
function OfferModal({ applicant, onClose, onSent }) {
  const toast = useToast();
  const [salary, setSalary] = useState('');
  const [joining, setJoining] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!salary) { toast.error('Please enter a salary amount.'); return; }
    setSending(true);
    try {
      await applicationsAPI.issueOffer(applicant.id, {
        salary: Number(salary),
        joining_date: joining || undefined,
      });
      toast.success(`Offer sent to ${applicant.student_name}!`);
      onSent();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send offer.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>Issue Offer</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSend} style={{ display: 'contents' }}>
          <div className="modal-body">
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)' }}>
              Sending offer to <strong style={{ color: 'var(--color-text-primary)' }}>{applicant.student_name}</strong>
            </p>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Annual Salary (₹)</label>
                <div className="offer-salary-row">
                  <span className="salary-prefix">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 800000"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Joining Date (optional)</label>
                <input
                  className="form-input"
                  type="date"
                  value={joining}
                  onChange={e => setJoining(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Applicant Card ──────────────────────────────────────────── */
function ApplicantCard({ app, jobRounds, onRoundUpdate, onIssueOffer }) {
  const [updating, setUpdating] = useState(false);
  const toast = useToast();

  const currentRoundIdx = (app.rounds || []).findIndex(
    r => !r.result || r.result === 'pending'
  );
  const activeIdx = currentRoundIdx === -1 ? (app.rounds || []).length : currentRoundIdx;

  const handleRoundResult = async (roundId, result) => {
    setUpdating(true);
    try {
      await applicationsAPI.updateRound(app.id, roundId, { result });
      toast.success(`Round marked as ${result}.`);
      onRoundUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update round.');
    } finally {
      setUpdating(false);
    }
  };

  const statusCfg = APP_STATUS_CONFIG[app.status] || { label: app.status, cls: 'badge-draft' };
  const matchScore = app.ai_match_score;
  const matchClass = getMatchClass(matchScore);

  return (
    <div className="applicant-card">
      <div className="applicant-card-header">
        <div className="applicant-avatar">{getInitials(app.student_name)}</div>
        <div className="applicant-info">
          <div className="applicant-name">{app.student_name || 'Unknown Student'}</div>
          <div className="applicant-meta">
            {app.roll_no && <span>{app.roll_no}</span>}
            {app.branch && <><span>•</span><span>{app.branch}</span></>}
            {app.cgpa && <><span>•</span><span>CGPA {app.cgpa}</span></>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
          <span className={`ai-match-badge ${matchClass}`}>
            <Sparkles size={11} />
            {matchScore != null ? `${matchScore}% Match` : 'AI N/A'}
          </span>
          <span className={statusCfg.cls}>{statusCfg.label}</span>
        </div>
      </div>

      <div className="applicant-card-body">
        {/* Rounds Timeline */}
        {jobRounds?.length > 0 && (
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
              Interview Progress
            </p>
            <div className="rounds-row">
              {jobRounds.map((round, idx) => {
                const appRound = (app.rounds || []).find(r => r.round_id === round.id || r.round_name === round.name);
                const state = appRound?.result === 'passed' ? 'passed'
                  : appRound?.result === 'failed' ? 'failed'
                  : idx === activeIdx ? 'current'
                  : 'pending';

                return (
                  <div key={round.id || idx} style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div className="timeline-step">
                      <div className={`timeline-dot ${state}`}>
                        {state === 'passed' ? <CheckCircle size={12} /> : state === 'failed' ? <XCircle size={12} /> : idx + 1}
                      </div>
                      <span className="timeline-label">{round.name}</span>
                    </div>
                    {idx < jobRounds.length - 1 && (
                      <div className={`step-connector ${state === 'passed' ? 'passed' : state === 'failed' ? 'failed' : ''}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="applicant-actions">
          {/* Round update — show only if there's an active round */}
          {jobRounds?.length > 0 && activeIdx < jobRounds.length && (
            <>
              <span className="action-label">Round {activeIdx + 1} Result:</span>
              {(() => {
                const activeRound = (app.rounds || [])[activeIdx];
                const roundId = activeRound?.round_id || jobRounds[activeIdx]?.id;
                return (
                  <>
                    <button
                      className="btn btn-success"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      disabled={updating || !roundId}
                      onClick={() => roundId && handleRoundResult(roundId, 'passed')}
                    >
                      <CheckCircle size={13} /> Pass
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      disabled={updating || !roundId}
                      onClick={() => roundId && handleRoundResult(roundId, 'failed')}
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </>
                );
              })()}
            </>
          )}

          {/* Issue Offer — show if all rounds passed or status is shortlisted */}
          {(app.status === 'shortlisted' || app.status === 'interview_scheduled' || activeIdx >= (jobRounds?.length || 0)) &&
           app.status !== 'offered' && app.status !== 'offer_accepted' && app.status !== 'rejected' && (
            <button
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.8rem', marginLeft: 'auto' }}
              onClick={() => onIssueOffer(app)}
            >
              <Gift size={13} /> Issue Offer
            </button>
          )}

          {/* Resume Download */}
          {app.resume_url && (
            <a
              href={app.resume_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ padding: '6px 14px', fontSize: '0.8rem', marginLeft: app.status === 'applied' ? 'auto' : 0 }}
            >
              <Download size={13} /> Resume
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ApplicantReview() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [search, setSearch] = useState('');
  const [offerModal, setOfferModal] = useState(null); // applicant object

  // Load company jobs
  useEffect(() => {
    async function loadJobs() {
      setLoadingJobs(true);
      try {
        const res = await jobsAPI.getAll();
        const list = res.data || [];
        setJobs(list);
        if (list.length > 0) setSelectedJob(list[0]);
      } catch {
        toast.error('Failed to load jobs.');
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  // Load applicants when selected job changes
  const loadApplicants = useCallback(async () => {
    if (!selectedJob) return;
    setLoadingApplicants(true);
    try {
      const res = await applicationsAPI.getJobApplicants(selectedJob.id);
      setApplicants(res.data || []);
    } catch {
      toast.error('Failed to load applicants.');
    } finally {
      setLoadingApplicants(false);
    }
  }, [selectedJob]);

  useEffect(() => { loadApplicants(); }, [loadApplicants]);

  const handleOfferSent = () => {
    setOfferModal(null);
    loadApplicants();
  };

  const filtered = applicants.filter(a =>
    !search ||
    a.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.roll_no?.toLowerCase().includes(search.toLowerCase())
  );

  const jobRounds = selectedJob?.rounds || [];

  return (
    <div>
      {/* Header */}
      <div className="company-page-header">
        <div className="header-info">
          <h1>Applicant Review</h1>
          <p>Review candidates, update interview rounds, and issue offers</p>
        </div>
      </div>

      <div className="applicant-layout">
        {/* Job Selector */}
        <div className="job-selector-panel">
          <div className="job-selector-header">
            <h3>Your Jobs</h3>
          </div>
          {loadingJobs ? (
            <div style={{ padding: 'var(--space-5)' }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-line medium" style={{ marginBottom: 'var(--space-3)', height: 36 }} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No jobs posted yet.</p>
            </div>
          ) : (
            <ul className="job-selector-list">
              {jobs.map(job => (
                <li
                  key={job.id}
                  className={`job-selector-item${selectedJob?.id === job.id ? ' active' : ''}`}
                  onClick={() => setSelectedJob(job)}
                >
                  <span className="job-name">{job.title}</span>
                  <span className="job-count">{job.applicant_count ?? 0} applicants</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Applicants Panel */}
        <div className="applicants-panel">
          <div className="applicants-panel-header">
            <div>
              <h2>
                {selectedJob ? selectedJob.title : 'Select a job'}
              </h2>
              {selectedJob && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
                  {jobRounds.length > 0 && ` · ${jobRounds.length} rounds`}
                </p>
              )}
            </div>
            {selectedJob && (
              <div className="company-search-wrap" style={{ maxWidth: 260 }}>
                <Search className="search-icon" size={15} />
                <input
                  className="company-search-input"
                  placeholder="Search applicants…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  id="applicant-search-input"
                />
              </div>
            )}
          </div>

          {!selectedJob ? (
            <div className="empty-state">
              <div className="empty-icon"><Briefcase size={28} /></div>
              <h3>Select a job to review applicants</h3>
              <p>Choose a job from the panel on the left to see all applicants.</p>
            </div>
          ) : loadingApplicants ? (
            <div className="jobs-table-card" style={{ overflow: 'hidden' }}>
              {[1, 2, 3].map(i => (
                <div className="skeleton-row" key={i}>
                  <div className="skeleton skeleton-avatar" />
                  <div className="skeleton-lines">
                    <div className="skeleton skeleton-line medium" />
                    <div className="skeleton skeleton-line short" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Users size={28} /></div>
              <h3>{search ? 'No applicants match your search' : 'No applicants yet'}</h3>
              <p>{search ? 'Try clearing the search.' : 'Applicants will appear here once students apply to this job.'}</p>
            </div>
          ) : (
            filtered.map(app => (
              <ApplicantCard
                key={app.id}
                app={app}
                jobRounds={jobRounds}
                onRoundUpdate={loadApplicants}
                onIssueOffer={setOfferModal}
              />
            ))
          )}
        </div>
      </div>

      {/* Offer Modal */}
      {offerModal && (
        <OfferModal
          applicant={offerModal}
          onClose={() => setOfferModal(null)}
          onSent={handleOfferSent}
        />
      )}
    </div>
  );
}
