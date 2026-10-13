import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Sparkles, Clock, ArrowRight,
  Briefcase, MapPin, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { jobsAPI, applicationsAPI, aiAPI } from '../../api';
import './StudentPortal.css';

export default function StudentDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [applications, setApplications] = useState([]);
  const [eligibleJobs, setEligibleJobs] = useState([]);
  const [resumeScore, setResumeScore] = useState(null);
  const [loading, setLoading] = useState(true);

  const displayName = user?.student_profile?.name
    || user?.email?.split('@')[0]
    || 'Student';

  useEffect(() => {
    async function fetchData() {
      try {
        const [appsRes, jobsRes] = await Promise.allSettled([
          applicationsAPI.getMyApplications(),
          jobsAPI.getEligible(),
        ]);

        if (appsRes.status === 'fulfilled') setApplications(appsRes.value.data || []);
        if (jobsRes.status === 'fulfilled') setEligibleJobs((jobsRes.value.data || []).slice(0, 3));

        // Try fetching resume analysis (might 404 if no resume uploaded)
        try {
          const scoreRes = await aiAPI.getResumeAnalysis();
          setResumeScore(scoreRes.data?.ats_score ?? null);
        } catch {
          // No resume analysis available
        }
      } catch (err) {
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Extract upcoming interviews from applications that have scheduled rounds
  const upcomingInterviews = applications
    .filter((app) => app.current_round || app.status === 'interview_scheduled')
    .slice(0, 2);

  // Active (non-final) applications
  const activeApplications = applications
    .filter((app) => !['rejected', 'offer_accepted', 'offer_declined'].includes(app.status))
    .slice(0, 3);

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: '50vh' }}>
        <div className="spinner spinner-lg" />
        <span className="text-secondary text-sm">Loading your dashboard…</span>
      </div>
    );
  }

  return (
    <div className="student-page animate-fade-in-up">
      {/* Welcome Header */}
      <div className="welcome-row">
        <div className="dashboard-welcome">
          <h2>Welcome back, {displayName}!</h2>
          <p>Here is what's happening with your placements today.</p>
        </div>
        <div className="resume-score-pill">
          <span className="score-icon">⭐</span>
          <div>
            <div className="score-label">Resume Score</div>
            <div className="score-value">{resumeScore !== null ? `${resumeScore}/100` : '—'}</div>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="bento-grid">
        {/* Active Applications — 8 cols */}
        <div className="bento-col-8 bento-card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>
            Active Applications
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeApplications.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px' }}>
                <div className="empty-state-icon">📋</div>
                <p>No active applications yet. Browse eligible jobs below!</p>
              </div>
            ) : (
              activeApplications.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))
            )}
          </div>
        </div>

        {/* Upcoming Interviews — 4 cols */}
        <div className="bento-col-4 interview-card">
          <div className="glow" />
          <h3>
            <Calendar size={20} />
            Upcoming Interviews
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {upcomingInterviews.length === 0 ? (
              <>
                <div className="interview-entry dimmed">
                  <div className="interview-date">
                    <span className="month">—</span>
                    <span className="day">—</span>
                  </div>
                  <div className="interview-info">
                    <h4>No interviews scheduled</h4>
                    <p>Check back later</p>
                  </div>
                </div>
              </>
            ) : (
              upcomingInterviews.map((app, i) => {
                const date = app.interview_date ? new Date(app.interview_date) : new Date();
                return (
                  <div className={`interview-entry ${i > 0 ? 'dimmed' : ''}`} key={app.id}>
                    <div className="interview-date">
                      <span className="month">
                        {date.toLocaleDateString('en', { month: 'short' })}
                      </span>
                      <span className="day">{date.getDate()}</span>
                    </div>
                    <div className="interview-info">
                      <h4>{app.round_name || 'Technical Round'} - {app.company_name || 'Company'}</h4>
                      <p>
                        <Clock size={12} />
                        {app.interview_time || '10:00 AM'} - {app.interview_mode || 'Online'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button className="btn-view-calendar">View Calendar</button>
        </div>

        {/* AI Matched Jobs — 12 cols */}
        <div className="bento-col-12 bento-card">
          <div className="ai-badge-header">
            <div className="ai-title-row">
              <div className="ai-icon">✨</div>
              <h3>AI Matched for You</h3>
            </div>
            <Link to="/student/applications" style={{ textDecoration: 'none' }}>
              See all matches
            </Link>
          </div>
          <div className="job-cards-grid">
            {eligibleJobs.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '32px' }}>
                <div className="empty-state-icon">🔍</div>
                <p>No matched jobs available right now. Check back later!</p>
              </div>
            ) : (
              eligibleJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Application Card Sub-component ─────────────────────── */
function ApplicationCard({ app }) {
  const statusMap = {
    applied: { label: 'Applied', cls: 'in-review' },
    under_review: { label: 'In Review', cls: 'in-review' },
    interview_scheduled: { label: 'Interview Scheduled', cls: 'interview' },
    offered: { label: 'Offered', cls: 'offered' },
    shortlisted: { label: 'Shortlisted', cls: 'interview' },
  };
  const status = statusMap[app.status] || { label: app.status || 'Applied', cls: 'in-review' };

  // Determine progress stage (0-3)
  const stages = ['Applied', 'Assessment', 'Interview', 'Offer'];
  let currentStage = 0;
  if (['shortlisted', 'under_review'].includes(app.status)) currentStage = 1;
  if (app.status === 'interview_scheduled') currentStage = 2;
  if (app.status === 'offered') currentStage = 3;

  return (
    <div className="application-item">
      <div className="application-header">
        <div>
          <h4>{app.job_title || 'Position'}</h4>
          <p>{app.company_name || 'Company'}</p>
        </div>
        <span className={`app-status-badge ${status.cls}`}>{status.label}</span>
      </div>
      <div className="progress-steps">
        <div className="progress-labels">
          {stages.map((s, i) => (
            <span
              key={s}
              className={i < currentStage ? 'completed' : i === currentStage ? 'current' : ''}
            >
              {s}
            </span>
          ))}
        </div>
        <div className="progress-track">
          {stages.map((_, i) => {
            if (i > 0) {
              return [
                <div key={`sep-${i}`} className="progress-segment separator" />,
                <div
                  key={`seg-${i}`}
                  className={`progress-segment ${
                    i < currentStage ? 'completed' : i === currentStage ? 'current' : ''
                  }`}
                  style={{ width: `${100 / stages.length}%` }}
                />,
              ];
            }
            return (
              <div
                key={`seg-${i}`}
                className={`progress-segment ${
                  i < currentStage ? 'completed' : i === currentStage ? 'current' : ''
                }`}
                style={{ width: `${100 / stages.length}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Job Card Sub-component ─────────────────────────────── */
function JobCard({ job }) {
  const toast = useToast();
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    setApplying(true);
    try {
      await applicationsAPI.apply(job.id);
      toast.success(`Applied to ${job.title} successfully!`);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to apply.';
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  };

  const skills = job.required_skills || [];
  const companyInitial = (job.company_name || 'C')[0].toUpperCase();
  const matchScore = job.match_score ? `${job.match_score}% Match` : null;

  return (
    <div className="job-card">
      <div className="job-card-header">
        <div className="job-card-logo">{companyInitial}</div>
        {matchScore && <span className="match-badge">{matchScore}</span>}
      </div>
      <h4>{job.title}</h4>
      <p className="job-meta">{job.company_name || 'Company'} • {job.location || 'Remote'}</p>
      <div className="job-skills">
        {skills.slice(0, 3).map((skill) => (
          <span key={skill} className="skill-tag">{skill}</span>
        ))}
      </div>
      <button
        className="btn-apply"
        onClick={handleApply}
        disabled={applying}
      >
        {applying ? 'Applying…' : 'Apply Now'}
      </button>
    </div>
  );
}
