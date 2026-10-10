import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Validation ────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
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
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.email}!`);

      // Redirect by role
      const home = {
        student: '/student/dashboard',
        tpo: '/tpo/dashboard',
        company: '/company/jobs',
      };
      navigate(home[user.role] || '/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid email or password';
      toast.error(typeof msg === 'string' ? msg : 'Login failed. Please try again.');
      setErrors({ submit: typeof msg === 'string' ? msg : 'Login failed' });
    } finally {
      setLoading(false);
    }
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
              Welcome back to your
              <br />
              <span className="gradient-text">Placement Hub</span>
            </h2>
            <p className="auth-brand-desc">
              Sign in to access your dashboard, track applications, and stay on top
              of every placement opportunity.
            </p>

            <div className="auth-brand-features">
              {[
                'AI-powered resume analysis',
                'Real-time application tracking',
                'Smart job matching',
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
          <div className="auth-form-wrapper">
            <div className="auth-form-header">
              <h1>Sign In</h1>
              <p>Enter your credentials to continue</p>
            </div>

            {errors.submit && (
              <div className="auth-error-banner">
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    id="login-email"
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

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                    autoComplete="current-password"
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

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>New to CampusHire?</span>
            </div>

            <Link to="/register" className="btn btn-secondary btn-full">
              Create an Account
            </Link>

            <p className="auth-footer-link">
              <Link to="/">← Back to home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
