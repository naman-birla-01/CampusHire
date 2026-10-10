import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Building, GraduationCap, Building2, CheckCircle2, ArrowRight
} from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
  const { user } = useAuth();

  // If already logged in, show a quick redirect hint
  const dashboardLink = user
    ? { student: '/student/dashboard', tpo: '/tpo/dashboard', company: '/company/jobs' }[user.role] || '/'
    : null;

  return (
    <div className="landing-light">
      {/* ── Top Header ── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="header-left">
            <Link to="/" className="header-logo">
              CampusHire
            </Link>
            <nav className="header-nav">
              <Link to="/" className="active">Dashboard</Link>
              <Link to="/jobs">Jobs</Link>
              <Link to="/analytics">Analytics</Link>
              <Link to="/reports">Reports</Link>
            </nav>
          </div>
          <div className="header-right">
            <Link to="/support" className="nav-link">Support</Link>
            {dashboardLink ? (
              <Link to={dashboardLink} className="btn btn-primary">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary">Post Job</Link>
                <Link to="/login" className="header-avatar">
                  <img src="https://i.pravatar.cc/150?img=11" alt="Login" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              The Modern Operating System for Campus Placements
            </h1>
            <p className="hero-subtitle">
              Connect students, placement cells, and recruiters on a single,
              seamless platform. Accelerate hiring, track performance, and
              guarantee academic integrity.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>
              <button className="btn btn-outline btn-lg">Request Demo</button>
            </div>
            <div className="hero-trust">
              <div className="trust-item">
                <CheckCircle2 size={18} className="trust-icon" />
                <span>Trusted by 500+ Universities</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={18} className="trust-icon" />
                <span>10k+ Top Recruiters</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-mockup">
              {/* Using a placeholder gradient to represent the isometric image */}
              <div className="mockup-image">
                 <div style={{ padding: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ 
                      width: '100%', height: '100%', 
                      background: 'url("https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800") center/cover',
                      borderRadius: '8px', opacity: 0.8 
                    }} />
                 </div>
              </div>
              <div className="mockup-bar">
                <div className="mockup-bar-left">
                  <strong>CampusHire</strong> - <span className="text-success">Welcome</span>
                </div>
                <div className="mockup-bar-right">
                   <div className="mockup-pill active">Home</div>
                   <div className="mockup-pill">Programs</div>
                   <div className="mockup-pill">Opportunities</div>
                   <div className="mockup-pill">Profile</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="features-section">
        <div className="features-container">
          
          <div className="feature-card">
            <div className="feature-icon-wrapper blue">
              <Building size={24} />
            </div>
            <h3>For Placement Cells</h3>
            <p>
              Automate eligibility checks, manage company visits,
              and generate real-time placement reports with
              absolute precision.
            </p>
            <Link to="/features" className="feature-link blue-link">
              Explore Features <ArrowRight size={14} />
            </Link>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper green">
              <GraduationCap size={24} />
            </div>
            <h3>For Students</h3>
            <p>
              Build verified academic profiles, track application
              stages effortlessly, and discover opportunities
              matching your exact skills.
            </p>
            <Link to="/student" className="feature-link green-link">
              Student Portal <ArrowRight size={14} />
            </Link>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper brown">
              <Building2 size={24} />
            </div>
            <h3>For Recruiters</h3>
            <p>
              Access pre-verified talent pools, conduct
              standardized assessments, and streamline the offer
              rollout process entirely online.
            </p>
            <Link to="/company" className="feature-link brown-link">
              Hiring Solutions <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-logo">CampusHire</div>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Help Center</a>
            <a href="#">Contact Support</a>
          </div>
          <div className="footer-copy">
            &copy; 2024 CampusHire Placement Management System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
