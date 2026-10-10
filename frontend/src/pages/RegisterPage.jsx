import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI } from '../api';
import {
  Mail, Lock, User, Building2, ArrowRight, Eye, EyeOff,
  GraduationCap, Briefcase, Sparkles, Phone, Hash, BookOpen,
} from 'lucide-react';
import './AuthPages.css';

// ── Role options ────────────────────────────────────────────
const ROLE_OPTIONS = [
  {
    value: 'student',
    label: 'Student',
    desc: 'Apply to jobs, upload resume, get AI insights',
    Icon: GraduationCap,
    color: '#6C47FF',
  },
  {
    value: 'company',
    label: 'Company',
    desc: 'Post jobs, review applicants, issue offers',
    Icon: Briefcase,
    color: '#FF8C42',
  },
];

export default function RegisterPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────
  const [step, setStep] = useState(1); // 1 = role select, 2 = form
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Student fields
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [phone, setPhone] = useState('');

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');

  // ── Validation ────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';

    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Minimum 6 characters';

    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

    if (role === 'student') {
      if (!name.trim()) errs.name = 'Name is required';
      if (!rollNumber.trim()) errs.rollNumber = 'Roll number is required';
      if (!branch.trim()) errs.branch = 'Branch is required';
      if (!cgpa.trim()) errs.cgpa = 'CGPA is required';
      else if (isNaN(parseFloat(cgpa)) || parseFloat(cgpa) < 0 || parseFloat(cgpa) > 10)
        errs.cgpa = 'CGPA must be 0–10';
    }

    if (role === 'company') {
      if (!companyName.trim()) errs.companyName = 'Company name is required';
    }

    return errs;
  }

  // ── Submit handler ────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const payload = { email, password, role };

      if (role === 'student') {
        payload.student_profile = {
          name,
          roll_number: rollNumber,
          branch,
          cgpa: parseFloat(cgpa),
          phone: phone || undefined,
        };
      } else if (role === 'company') {
        payload.company_profile = {
          company_name: companyName,
          industry: industry || undefined,
          website: website || undefined,
        };
      }

      await authAPI.register(payload);
      toast.success('Account created! Signing you in…');

      // Auto-login after registration
      const user = await login(email, password);
      const home = {
        student: '/student/dashboard',
        tpo: '/tpo/dashboard',
        company: '/company/jobs',
      };
      navigate(home[user.role] || '/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail;
      const errMsg = typeof msg === 'string' ? msg : 'Registration failed. Please try again.';
      toast.error(errMsg);
      setErrors({ submit: errMsg });
    } finally {
      setLoading(false);
    }
  }

  // ── Role Selection Step ───────────────────────────────────
  function renderRoleSelection() {
    return (
      <div className="auth-form-wrapper animate-fade-in">
        <div className="auth-form-header">
          <h1>Create Account</h1>
          <p>Choose your role to get started</p>
        </div>

        <div className="role-selector-grid">
          {ROLE_OPTIONS.map(({ value, label, desc, Icon, color }) => (
            <button
              key={value}
              type="button"
              className={`role-selector-card ${role === value ? 'selected' : ''}`}
              style={{ '--card-accent': color }}
              onClick={() => setRole(value)}
            >
              <div className="role-selector-icon" style={{ background: `${color}22`, color }}>
                <Icon size={28} />
              </div>
              <div className="role-selector-label">{label}</div>
              <div className="role-selector-desc">{desc}</div>
              {role === value && (
                <div className="role-selector-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="12" fill={color} />
                    <path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary btn-full btn-lg auth-submit-btn"
          disabled={!role}
          onClick={() => setStep(2)}
        >
          Continue <ArrowRight size={16} />
        </button>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <Link to="/login" className="btn btn-secondary btn-full">
          Sign In
        </Link>

        <p className="auth-footer-link">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    );
  }

  // ── Registration Form Step ────────────────────────────────
  function renderForm() {
    const selectedRole = ROLE_OPTIONS.find((r) => r.value === role);
    const RoleIcon = selectedRole?.Icon || User;
    const roleColor = selectedRole?.color || '#6C47FF';

    return (
      <div className="auth-form-wrapper animate-fade-in">
        <div className="auth-form-header">
          <button
            className="auth-back-btn"
            onClick={() => setStep(1)}
            type="button"
          >
            ← Change role
          </button>
          <h1>
            Register as{' '}
            <span style={{ color: roleColor }}>{selectedRole?.label}</span>
          </h1>
          <p>Fill in your details to create your account</p>
        </div>

        {errors.submit && (
          <div className="auth-error-banner">{errors.submit}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                id="reg-email"
                type="email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                autoComplete="email"
                autoFocus
              />
            </div>
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {/* ── Student-specific fields ── */}
          {role === 'student' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full Name</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input
                    id="reg-name"
                    type="text"
                    className={`form-input ${errors.name ? 'input-error' : ''}`}
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                  />
                </div>
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              <div className="auth-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-roll">Roll Number</label>
                  <div className="input-with-icon">
                    <Hash size={16} className="input-icon" />
                    <input
                      id="reg-roll"
                      type="text"
                      className={`form-input ${errors.rollNumber ? 'input-error' : ''}`}
                      placeholder="CSE2024001"
                      value={rollNumber}
                      onChange={(e) => { setRollNumber(e.target.value); setErrors((p) => ({ ...p, rollNumber: '' })); }}
                    />
                  </div>
                  {errors.rollNumber && <span className="field-error">{errors.rollNumber}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-branch">Branch</label>
                  <div className="input-with-icon">
                    <BookOpen size={16} className="input-icon" />
                    <input
                      id="reg-branch"
                      type="text"
                      className={`form-input ${errors.branch ? 'input-error' : ''}`}
                      placeholder="Computer Science"
                      value={branch}
                      onChange={(e) => { setBranch(e.target.value); setErrors((p) => ({ ...p, branch: '' })); }}
                    />
                  </div>
                  {errors.branch && <span className="field-error">{errors.branch}</span>}
                </div>
              </div>

              <div className="auth-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-cgpa">CGPA</label>
                  <input
                    id="reg-cgpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    className={`form-input ${errors.cgpa ? 'input-error' : ''}`}
                    placeholder="8.50"
                    value={cgpa}
                    onChange={(e) => { setCgpa(e.target.value); setErrors((p) => ({ ...p, cgpa: '' })); }}
                  />
                  {errors.cgpa && <span className="field-error">{errors.cgpa}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-phone">Phone <span className="text-muted text-xs">(optional)</span></label>
                  <div className="input-with-icon">
                    <Phone size={16} className="input-icon" />
                    <input
                      id="reg-phone"
                      type="tel"
                      className="form-input"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Company-specific fields ── */}
          {role === 'company' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-company-name">Company Name</label>
                <div className="input-with-icon">
                  <Building2 size={16} className="input-icon" />
                  <input
                    id="reg-company-name"
                    type="text"
                    className={`form-input ${errors.companyName ? 'input-error' : ''}`}
                    placeholder="Acme Corp"
                    value={companyName}
                    onChange={(e) => { setCompanyName(e.target.value); setErrors((p) => ({ ...p, companyName: '' })); }}
                  />
                </div>
                {errors.companyName && <span className="field-error">{errors.companyName}</span>}
              </div>

              <div className="auth-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-industry">Industry <span className="text-muted text-xs">(optional)</span></label>
                  <input
                    id="reg-industry"
                    type="text"
                    className="form-input"
                    placeholder="Technology"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-website">Website <span className="text-muted text-xs">(optional)</span></label>
                  <input
                    id="reg-website"
                    type="url"
                    className="form-input"
                    placeholder="https://acme.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-toggle-password"
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm-password">Confirm Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="reg-confirm-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                autoComplete="new-password"
              />
            </div>
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Creating account…
              </>
            ) : (
              <>
                Create Account <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <Link to="/login" className="btn btn-secondary btn-full">
          Sign In
        </Link>

        <p className="auth-footer-link">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Background effects */}
      <div className="auth-bg-glow auth-bg-glow-1" />
      <div className="auth-bg-glow auth-bg-glow-2" />
      <div className="auth-grid-bg" />

      <div className="auth-container">
        {/* ── Left panel — Branding ── */}
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <Link to="/" className="auth-logo">
              <div className="auth-logo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff" />
                  <path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M2 12l10 5 10-5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span>CampusHire</span>
            </Link>

            <h2 className="auth-brand-title">
              Join the smarter way to
              <br />
              <span className="gradient-text">Campus Placement</span>
            </h2>
            <p className="auth-brand-desc">
              Create your account and unlock AI-powered resume analysis,
              smart job matching, and real-time placement tracking.
            </p>

            <div className="auth-brand-features">
              {[
                'Free forever for students',
                'AI-powered placement matching',
                'Track every application stage',
              ].map((feat) => (
                <div key={feat} className="auth-brand-feature">
                  <Sparkles size={14} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative orb */}
          <div className="auth-brand-orb" />
        </div>

        {/* ── Right panel — Form ── */}
        <div className="auth-form-panel">
          {step === 1 ? renderRoleSelection() : renderForm()}
        </div>
      </div>
    </div>
  );
}
