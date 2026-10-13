import { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Hash, GraduationCap, Upload, Download,
  Eye, Save, Loader2, CheckCircle, Clock as ClockIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentsAPI } from '../../api';
import './StudentPortal.css';

export default function StudentProfile() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Editable form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    branch: '',
    cgpa: '',
    graduation_year: '',
    tenth_percentage: '',
    twelfth_percentage: '',
    skills: '',
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await studentsAPI.getMe();
        const p = res.data;
        setProfile(p);
        setForm({
          name: p.name || '',
          phone: p.phone || '',
          branch: p.branch || '',
          cgpa: p.cgpa ?? '',
          graduation_year: p.graduation_year ?? '',
          tenth_percentage: p.tenth_percentage ?? '',
          twelfth_percentage: p.twelfth_percentage ?? '',
          skills: (p.skills || []).join(', '),
        });
      } catch {
        toast.error('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        cgpa: form.cgpa ? parseFloat(form.cgpa) : undefined,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : undefined,
        tenth_percentage: form.tenth_percentage ? parseFloat(form.tenth_percentage) : undefined,
        twelfth_percentage: form.twelfth_percentage ? parseFloat(form.twelfth_percentage) : undefined,
        skills: form.skills
          ? form.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      const res = await studentsAPI.updateMe(payload);
      setProfile(res.data);
      await refreshUser();
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await studentsAPI.uploadResume(file);
      toast.success('Resume uploaded successfully!');
      // Refresh profile to get new resume URL
      const res = await studentsAPI.getMe();
      setProfile(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload resume.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: '50vh' }}>
        <div className="spinner spinner-lg" />
        <span className="text-secondary text-sm">Loading profile…</span>
      </div>
    );
  }

  const verificationStatus = profile?.is_verified;
  const skills = profile?.skills || [];
  const initials = (profile?.name || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
            My Profile
          </h2>
        </div>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="bento-grid">
        {/* Left Column — Profile Card + Academic Snapshot (4 cols) */}
        <div className="bento-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile Card */}
          <div className="bento-card profile-card" style={{ padding: '24px 16px' }}>
            <div className="gradient-bg" />
            <span className={`verification-badge ${verificationStatus ? 'verified' : 'pending'}`}>
              {verificationStatus ? (
                <><CheckCircle size={10} /> Verified</>
              ) : (
                <><ClockIcon size={10} /> Pending Review</>
              )}
            </span>
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">
                <div className="profile-avatar-placeholder">{initials}</div>
              </div>
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '4px',
            }}>
              {profile?.name || 'Student'}
            </h3>
            <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>
              {profile?.branch ? `B.Tech | ${profile.branch}` : 'No branch set'}
            </p>
            <div className="profile-details">
              <div className="profile-detail-row">
                <Hash size={16} />
                <span>ID: {profile?.roll_number || user?.email?.split('@')[0] || '—'}</span>
              </div>
              <div className="profile-detail-row">
                <Mail size={16} />
                <span>{user?.email || '—'}</span>
              </div>
              <div className="profile-detail-row">
                <Phone size={16} />
                <span>{profile?.phone || 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* Academic Snapshot */}
          <div className="bento-card">
            <div className="section-card-header">
              <GraduationCap size={14} />
              Academic Snapshot
            </div>
            <div className="academic-grid">
              <div className="academic-cell">
                <div className="cell-label">Current CGPA</div>
                <div className="cell-value primary">
                  {profile?.cgpa ?? '—'}
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>/10</span>
                </div>
              </div>
              <div className="academic-cell">
                <div className="cell-label">Active Backlogs</div>
                <div className="cell-value success">{profile?.active_backlogs ?? 0}</div>
              </div>
              <div className="academic-cell">
                <div className="cell-label">Graduation Year</div>
                <div className="cell-value">{profile?.graduation_year || '—'}</div>
              </div>
              <div className="academic-cell">
                <div className="cell-label">12th Percentage</div>
                <div className="cell-value">
                  {profile?.twelfth_percentage ? `${profile.twelfth_percentage}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Edit Form + Skills + Resume (8 cols) */}
        <div className="bento-col-8" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Skills Section */}
          <div className="bento-card skills-section">
            <h4>Technical Proficiencies</h4>
            <p className="text-sm text-secondary" style={{ marginBottom: '12px' }}>
              Self-reported technical skills.
            </p>
            {skills.length > 0 ? (
              <div className="skills-chips">
                {skills.map((skill) => (
                  <span key={skill} className="skill-chip">{skill}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No skills added yet. Edit below to add skills.</p>
            )}
          </div>

          {/* Edit Form */}
          <div className="bento-card">
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>
              Edit Profile Details
            </h4>
            <div className="profile-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Branch</label>
                <input
                  className="form-input"
                  value={form.branch}
                  onChange={(e) => handleChange('branch', e.target.value)}
                  placeholder="Computer Science & Engineering"
                />
              </div>
              <div className="form-group">
                <label className="form-label">CGPA</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={form.cgpa}
                  onChange={(e) => handleChange('cgpa', e.target.value)}
                  placeholder="8.75"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Graduation Year</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.graduation_year}
                  onChange={(e) => handleChange('graduation_year', e.target.value)}
                  placeholder="2024"
                />
              </div>
              <div className="form-group">
                <label className="form-label">12th Percentage</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.1"
                  value={form.twelfth_percentage}
                  onChange={(e) => handleChange('twelfth_percentage', e.target.value)}
                  placeholder="92.4"
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Skills (comma-separated)</label>
                <input
                  className="form-input"
                  value={form.skills}
                  onChange={(e) => handleChange('skills', e.target.value)}
                  placeholder="React.js, Python, SQL, Node.js"
                />
              </div>
            </div>
          </div>

          {/* Resume Document */}
          <div className="bento-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Resume Document</h4>
              {profile?.resume_url && (
                <a
                  href={profile.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--color-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}
                >
                  <Download size={14} /> Download PDF
                </a>
              )}
            </div>

            {profile?.resume_url ? (
              <div className="resume-preview">
                <div className="resume-skeleton">
                  <div className="line title" />
                  <div className="line mid" />
                  <div className="line short" style={{ marginBottom: '20px' }} />
                  <div className="line short" style={{ height: 5, width: '25%' }} />
                  <div className="line long" />
                  <div className="line long" />
                  <div className="line mid" style={{ marginBottom: '16px' }} />
                  <div className="line short" style={{ height: 5, width: '25%' }} />
                  <div className="line long" />
                  <div className="line mid" />
                </div>
                <div className="resume-preview-overlay">
                  <a
                    href={profile.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Eye size={16} /> View Full Screen
                  </a>
                </div>
              </div>
            ) : (
              <div
                className="upload-zone"
                onClick={() => fileRef.current?.click()}
              >
                <div className="upload-icon">📄</div>
                <p>{uploading ? 'Uploading…' : 'Click to upload your resume'}</p>
                <p className="upload-hint">PDF, DOC, or DOCX (max 5 MB)</p>
              </div>
            )}

            <input
              type="file"
              ref={fileRef}
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleResumeUpload}
            />

            {profile?.resume_url && (
              <button
                className="btn btn-secondary btn-full"
                style={{ marginTop: '12px' }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={14} />
                {uploading ? 'Uploading…' : 'Upload New Resume'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
