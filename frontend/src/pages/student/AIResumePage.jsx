import { useState, useEffect } from 'react';
import {
  Sparkles, RefreshCw, Loader2, AlertTriangle,
  CheckCircle, XCircle, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { aiAPI } from '../../api';
import './StudentPortal.css';

export default function AIResumePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const displayName = user?.student_profile?.name
    || user?.email?.split('@')[0]
    || 'Student';

  useEffect(() => {
    fetchAnalysis();
  }, []);

  async function fetchAnalysis() {
    setLoading(true);
    try {
      const res = await aiAPI.getResumeAnalysis();
      setAnalysis(res.data);
    } catch {
      // No analysis available yet
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleReanalyze() {
    setAnalyzing(true);
    try {
      await aiAPI.triggerAnalysis();
      toast.success('Analysis triggered! Refreshing…');
      // Wait briefly then re-fetch
      setTimeout(async () => {
        await fetchAnalysis();
        setAnalyzing(false);
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to trigger analysis.');
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: '50vh' }}>
        <div className="spinner spinner-lg" />
        <span className="text-secondary text-sm">Loading AI analysis…</span>
      </div>
    );
  }

  // Defaults / fallback
  const score = analysis?.ats_score ?? 0;
  const suggestions = analysis?.suggestions || [];
  const keywords = analysis?.keywords || [];
  const scoreOffset = 283 - (283 * score) / 100;

  // Build suggestion items from AI data or use defaults
  const insightItems = suggestions.length > 0
    ? suggestions.map((s, i) => ({
        title: s.title || `Suggestion ${i + 1}`,
        description: s.description || s,
        type: i === 0 ? 'primary' : i === 1 ? 'secondary' : 'error',
      }))
    : [
        {
          title: 'Quantify Impact',
          description: 'Try quantifying achievements: "Improved database query speed by 40% leading to reduced server load."',
          type: 'primary',
        },
        {
          title: 'Action Verbs Check',
          description: 'Use strong action verbs (Spearheaded, Architected, Delivered) consistently across all roles.',
          type: 'secondary',
        },
        {
          title: 'Missing Keywords',
          description: 'Consider adding keywords like "Docker" and "Kubernetes" if you possess these skills to improve ATS matching.',
          type: 'error',
        },
      ];

  const keywordItems = keywords.length > 0
    ? keywords
    : ['Python', 'React.js', 'SQL', 'Node.js', 'Agile', 'AWS EC2', 'Team Leadership'];

  // Composition bars
  const composition = analysis?.composition || [
    { label: 'Technical Skills', percent: 60, color: 'var(--color-primary)' },
    { label: 'Soft Skills / Leadership', percent: 25, color: '#006C4A' },
    { label: 'Domain Knowledge', percent: 15, color: '#653400' },
  ];

  return (
    <div className="student-page animate-fade-in-up">
      {/* Header */}
      <div className="welcome-row">
        <div>
          <h2
            className="ai-gradient-text"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Resume Analysis
          </h2>
          <p className="text-secondary" style={{ fontSize: '1rem', marginTop: '4px' }}>
            Powered by Gemini AI. Detailed breakdown of {displayName}'s profile.
          </p>
        </div>
        <button
          className="btn-reanalyze"
          onClick={handleReanalyze}
          disabled={analyzing}
        >
          {analyzing ? <Loader2 size={16} /> : <RefreshCw size={16} />}
          {analyzing ? 'Analyzing…' : 'Re-analyze'}
        </button>
      </div>

      {!analysis ? (
        <div className="bento-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>🤖</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No Resume Analysis Available</h3>
          <p className="text-secondary" style={{ marginBottom: '24px' }}>
            Upload your resume on the Profile page first, then click "Re-analyze" to get AI-powered insights.
          </p>
          <button className="btn btn-primary" onClick={handleReanalyze} disabled={analyzing}>
            <Sparkles size={16} />
            {analyzing ? 'Analyzing…' : 'Run Analysis'}
          </button>
        </div>
      ) : (
        <div className="bento-grid">
          {/* ATS Score — 4 cols */}
          <div className="bento-col-4 bento-card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
          }}>
            <div className="ai-glow" />
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              alignSelf: 'flex-start',
              width: '100%',
              marginBottom: '24px',
            }}>
              ATS Match Score
            </h3>

            <div className="score-circle-container">
              <svg viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00236f" />
                    <stop offset="100%" stopColor="#006c4a" />
                  </linearGradient>
                </defs>
                <circle className="score-circle-bg" cx="50" cy="50" r="45" />
                <circle
                  className="score-circle-progress"
                  cx="50"
                  cy="50"
                  r="45"
                  style={{ strokeDashoffset: scoreOffset }}
                />
              </svg>
              <div className="score-text">
                <span className="score-number">{score}</span>
                <span className="score-total">/ 100</span>
              </div>
            </div>

            <div className="score-status">
              <span className="status-label">Status</span>
              <span className="status-badge">
                {score >= 80 ? 'Highly Eligible' : score >= 60 ? 'Eligible' : 'Needs Improvement'}
              </span>
            </div>
          </div>

          {/* Gemini Insights — 8 cols */}
          <div className="bento-col-8 bento-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Gemini Insights</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {insightItems.map((item, i) => (
                <div key={i} className={`insight-item ${item.type}`}>
                  <h3>{item.title}</h3>
                  <p>{typeof item.description === 'string' ? item.description : item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Keyword Extraction — 6 cols */}
          <div className="bento-col-6 bento-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>
              Keyword Extraction
            </h3>
            <div className="keyword-chips">
              {keywordItems.map((kw, i) => {
                const keyword = typeof kw === 'string' ? kw : kw.keyword || kw;
                const level = typeof kw === 'object' ? kw.level : null;
                let cls = 'neutral';
                if (level === 'expert' || level === 'advanced' || i < 3) cls = 'primary';
                if (level === 'soft' || i === 4 || i === 6) cls = 'secondary';
                return (
                  <span key={i} className={`keyword-chip ${cls}`}>
                    {keyword}{level ? ` (${level})` : ''}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Profile Composition — 6 cols */}
          <div className="bento-col-6 bento-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>
              Profile Composition
            </h3>
            <div>
              {composition.map((item, i) => {
                const label = item.label || item.category || `Category ${i + 1}`;
                const percent = item.percent || item.value || 0;
                const colors = ['var(--color-primary)', '#006C4A', '#653400'];
                const labelColors = ['var(--color-primary)', '#006C4A', '#653400'];
                return (
                  <div key={i} className="composition-bar">
                    <div className="bar-header">
                      <span className="bar-label">{label}</span>
                      <span className="bar-percent" style={{ color: labelColors[i] || colors[0] }}>
                        {percent}%
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: colors[i] || colors[0],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
