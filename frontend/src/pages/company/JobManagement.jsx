import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Plus, Search, Edit2, Trash2, Users,
  CheckCircle, X, MapPin, DollarSign, GraduationCap,
  ToggleLeft, ToggleRight, PlusCircle,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { jobsAPI } from '../../api';
import './CompanyPortal.css';

/* ─── Constants ──────────────────────────────────────────────── */
const STATUS_FILTERS = [
  { value: 'all', label: 'All Jobs' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'draft', label: 'Draft' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  location: '',
  job_type: 'full_time',
  ctc_min: '',
  ctc_max: '',
  cgpa_cutoff: '',
  passing_year: new Date().getFullYear(),
  allowed_branches: '',
  is_active: true,
  rounds: [{ name: 'Aptitude Test' }, { name: 'Technical Interview' }],
};

/* ─── Job Modal ──────────────────────────────────────────────── */
function JobModal({ job, onClose, onSave }) {
  const [form, setForm] = useState(job ? {
    ...job,
    allowed_branches: Array.isArray(job.allowed_branches)
      ? job.allowed_branches.join(', ')
      : job.allowed_branches || '',
    rounds: job.rounds?.length ? job.rounds : EMPTY_FORM.rounds,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const setRound = (idx, val) =>
    setForm(f => {
      const rounds = [...f.rounds];
      rounds[idx] = { ...rounds[idx], name: val };
      return { ...f, rounds };
    });

  const addRound = () =>
    setForm(f => ({ ...f, rounds: [...f.rounds, { name: '' }] }));

  const removeRound = (idx) =>
    setForm(f => ({ ...f, rounds: f.rounds.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Job title is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        ctc_min: form.ctc_min ? Number(form.ctc_min) : null,
        ctc_max: form.ctc_max ? Number(form.ctc_max) : null,
        cgpa_cutoff: form.cgpa_cutoff ? Number(form.cgpa_cutoff) : null,
        passing_year: form.passing_year ? Number(form.passing_year) : null,
        allowed_branches: form.allowed_branches
          ? form.allowed_branches.split(',').map(b => b.trim()).filter(Boolean)
          : [],
        rounds: form.rounds.filter(r => r.name.trim()),
      };
      if (job) {
        await jobsAPI.update(job.id, payload);
        toast.success('Job updated successfully!');
      } else {
        await jobsAPI.create(payload);
        toast.success('Job posted successfully!');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save job.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <h2>{job ? 'Edit Job' : 'Post New Job'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="modal-body">
            <div className="form-grid cols-2">
              {/* Title */}
              <div className="form-group col-span-2">
                <label className="form-label">Job Title *</label>
                <input className="form-input" placeholder="e.g. Software Engineer" value={form.title}
                  onChange={e => set('title', e.target.value)} required />
              </div>

              {/* Job Type */}
              <div className="form-group">
                <label className="form-label">Job Type</label>
                <select className="form-select" value={form.job_type} onChange={e => set('job_type', e.target.value)}>
                  <option value="full_time">Full Time</option>
                  <option value="internship">Internship</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" placeholder="e.g. Bangalore / Remote" value={form.location}
                  onChange={e => set('location', e.target.value)} />
              </div>

              {/* CTC Range */}
              <div className="form-group">
                <label className="form-label">CTC Min (LPA)</label>
                <input className="form-input" type="number" min="0" step="0.5" placeholder="e.g. 6"
                  value={form.ctc_min} onChange={e => set('ctc_min', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">CTC Max (LPA)</label>
                <input className="form-input" type="number" min="0" step="0.5" placeholder="e.g. 12"
                  value={form.ctc_max} onChange={e => set('ctc_max', e.target.value)} />
              </div>

              {/* Eligibility */}
              <div className="form-group">
                <label className="form-label">Min CGPA</label>
                <input className="form-input" type="number" min="0" max="10" step="0.1" placeholder="e.g. 7.0"
                  value={form.cgpa_cutoff} onChange={e => set('cgpa_cutoff', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Passing Year</label>
                <input className="form-input" type="number" placeholder="e.g. 2025"
                  value={form.passing_year} onChange={e => set('passing_year', e.target.value)} />
              </div>

              {/* Branches */}
              <div className="form-group col-span-2">
                <label className="form-label">Allowed Branches (comma-separated)</label>
                <input className="form-input" placeholder="e.g. CSE, ECE, IT"
                  value={form.allowed_branches} onChange={e => set('allowed_branches', e.target.value)} />
              </div>

              {/* Description */}
              <div className="form-group col-span-2">
                <label className="form-label">Job Description</label>
                <textarea className="form-textarea" rows={4} placeholder="Describe the role, responsibilities, and requirements…"
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              {/* Status Toggle */}
              <div className="form-group col-span-2">
                <label className="form-label">Status</label>
                <label className="toggle-wrap">
                  <span className="toggle-switch">
                    <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
                    <span className="toggle-slider" />
                  </span>
                  <span className="toggle-label">{form.is_active ? 'Active — Open for applications' : 'Inactive — Not accepting applications'}</span>
                </label>
              </div>

              {/* Interview Rounds */}
              <div className="form-group col-span-2">
                <label className="form-label">Interview Rounds</label>
                <div className="rounds-builder">
                  {form.rounds.map((r, idx) => (
                    <div className="round-row" key={idx}>
                      <span className="round-badge">{idx + 1}</span>
                      <input
                        placeholder={`Round ${idx + 1} name`}
                        value={r.name}
                        onChange={e => setRound(idx, e.target.value)}
                      />
                      {form.rounds.length > 1 && (
                        <button type="button" className="btn-icon danger" onClick={() => removeRound(idx)}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="add-round-btn" onClick={addRound}>
                    <PlusCircle size={14} /> Add Round
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : job ? 'Update Job' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Badge helper ───────────────────────────────────────────── */
function StatusBadge({ isActive }) {
  return isActive
    ? <span className="badge-open">Open</span>
    : <span className="badge-closed">Closed</span>;
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function JobManagement() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editJob, setEditJob] = useState(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsAPI.getAll();
      setJobs(res.data || []);
    } catch {
      toast.error('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      await jobsAPI.delete(job.id);
      toast.success('Job deleted.');
      loadJobs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete job.');
    }
  };

  const handleEdit = (job) => { setEditJob(job); setShowModal(true); };
  const handleNew = () => { setEditJob(null); setShowModal(true); };
  const handleModalClose = () => { setShowModal(false); setEditJob(null); };
  const handleSaved = () => { handleModalClose(); loadJobs(); };

  // Stats
  const totalJobs = jobs.length;
  const openJobs = jobs.filter(j => j.is_active).length;
  const totalApplicants = jobs.reduce((s, j) => s + (j.applicant_count || 0), 0);
  const totalRounds = jobs.reduce((s, j) => s + (j.rounds?.length || 0), 0);

  // Filter
  const filtered = jobs.filter(j => {
    const matchSearch = !search ||
      j.title?.toLowerCase().includes(search.toLowerCase()) ||
      j.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'open' && j.is_active)
      || (filterStatus === 'closed' && !j.is_active);
    return matchSearch && matchStatus;
  });

  const formatCTC = (min, max) => {
    if (!min && !max) return '—';
    if (min && max) return `₹${min}–${max} LPA`;
    return `₹${min || max} LPA`;
  };

  return (
    <div>
      {/* Header */}
      <div className="company-page-header">
        <div className="header-info">
          <h1>Job Management</h1>
          <p>Post, manage and track all your campus recruitment listings</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew} id="btn-post-new-job">
          <Plus size={16} /> Post New Job
        </button>
      </div>

      {/* Stats */}
      <div className="company-stats-row">
        {[
          { icon: Briefcase, color: 'blue',   value: totalJobs,        label: 'Total Jobs' },
          { icon: CheckCircle, color: 'green', value: openJobs,         label: 'Open Positions' },
          { icon: Users,      color: 'purple', value: totalApplicants,  label: 'Total Applicants' },
          { icon: GraduationCap, color: 'amber', value: totalRounds,   label: 'Total Interview Rounds' },
        ].map(({ icon: Icon, color, value, label }) => (
          <div className="company-stat-card" key={label}>
            <div className={`company-stat-icon ${color}`}><Icon size={20} /></div>
            <div className="company-stat-info">
              <div className="stat-value">{loading ? '—' : value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="company-toolbar">
        <div className="company-search-wrap">
          <Search className="search-icon" size={16} />
          <input
            id="job-search-input"
            className="company-search-input"
            placeholder="Search by title or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-filters">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              className={`filter-chip${filterStatus === f.value ? ' active' : ''}`}
              onClick={() => setFilterStatus(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="jobs-table-card">
        {loading ? (
          <div>
            {[1, 2, 3].map(i => (
              <div className="skeleton-row" key={i}>
                <div className="skeleton-lines">
                  <div className="skeleton skeleton-line medium" />
                  <div className="skeleton skeleton-line short" />
                </div>
                <div className="skeleton skeleton-line" style={{ width: 60 }} />
                <div className="skeleton skeleton-line" style={{ width: 80 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Briefcase size={28} /></div>
            <h3>{search || filterStatus !== 'all' ? 'No jobs match your filters' : 'No jobs posted yet'}</h3>
            <p>{search || filterStatus !== 'all' ? 'Try clearing your search or filters.' : 'Click "Post New Job" to get started.'}</p>
            {!search && filterStatus === 'all' && (
              <button className="btn btn-primary" onClick={handleNew}><Plus size={14} /> Post New Job</button>
            )}
          </div>
        ) : (
          <div className="jobs-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>CTC</th>
                  <th>Rounds</th>
                  <th>Applicants</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(job => (
                  <tr key={job.id}>
                    <td>
                      <div className="job-title-cell">
                        <span className="job-title">{job.title}</span>
                        <span className="job-meta">
                          {job.location && <><MapPin size={11} />{job.location}</>}
                          {job.cgpa_cutoff && <><span style={{ color: 'var(--color-border-strong)' }}>•</span>Min CGPA {job.cgpa_cutoff}</>}
                          {job.job_type && <><span style={{ color: 'var(--color-border-strong)' }}>•</span>{job.job_type.replace('_', ' ')}</>}
                        </span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <DollarSign size={13} style={{ color: 'var(--color-text-muted)' }} />
                        {formatCTC(job.ctc_min, job.ctc_max)}
                      </span>
                    </td>
                    <td>
                      <div className="rounds-dots">
                        {(job.rounds || []).map((_, i) => (
                          <div key={i} className="round-dot filled" />
                        ))}
                        {(!job.rounds || job.rounds.length === 0) && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}
                        {job.rounds?.length > 0 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>{job.rounds.length}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Users size={13} style={{ color: 'var(--color-text-muted)' }} />
                        {job.applicant_count ?? 0}
                      </span>
                    </td>
                    <td><StatusBadge isActive={job.is_active} /></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" title="Edit" onClick={() => handleEdit(job)} id={`btn-edit-job-${job.id}`}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(job)} id={`btn-delete-job-${job.id}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <JobModal job={editJob} onClose={handleModalClose} onSave={handleSaved} />
      )}
    </div>
  );
}
