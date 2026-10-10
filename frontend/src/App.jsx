import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

// ── Lazy-loaded pages ──────────────────────────────────────
const LandingPage        = lazy(() => import('./pages/LandingPage.jsx'));
const LoginPage          = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage       = lazy(() => import('./pages/RegisterPage.jsx'));

// Student
const StudentDashboard   = lazy(() => import('./pages/student/StudentDashboard.jsx'));
const StudentProfile     = lazy(() => import('./pages/student/StudentProfile.jsx'));
const AIResumePage       = lazy(() => import('./pages/student/AIResumePage.jsx'));
const StudentApplications = lazy(() => import('./pages/student/StudentApplications.jsx'));

// TPO
const TPODashboard       = lazy(() => import('./pages/tpo/TPODashboard.jsx'));
const TPOStudents        = lazy(() => import('./pages/tpo/TPOStudents.jsx'));
const TPOJobs            = lazy(() => import('./pages/tpo/TPOJobs.jsx'));

// Company
const JobManagement      = lazy(() => import('./pages/company/JobManagement.jsx'));
const ApplicantReview    = lazy(() => import('./pages/company/ApplicantReview.jsx'));

// ── Page loader fallback ───────────────────────────────────
function PageLoader() {
  return (
    <div className="page-loader" style={{ minHeight: '60vh' }}>
      <div className="spinner spinner-lg" />
      <span className="text-secondary text-sm">Loading page…</span>
    </div>
  );
}

// ── Wrapped page (inside Layout) ───────────────────────────
function WithLayout({ children }) {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        {/* ── Student ── */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute role="student">
              <WithLayout><StudentDashboard /></WithLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute role="student">
              <WithLayout><StudentProfile /></WithLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/resume"
          element={
            <ProtectedRoute role="student">
              <WithLayout><AIResumePage /></WithLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/applications"
          element={
            <ProtectedRoute role="student">
              <WithLayout><StudentApplications /></WithLayout>
            </ProtectedRoute>
          }
        />

        {/* ── TPO ── */}
        <Route
          path="/tpo/dashboard"
          element={
            <ProtectedRoute role="tpo">
              <WithLayout><TPODashboard /></WithLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tpo/students"
          element={
            <ProtectedRoute role="tpo">
              <WithLayout><TPOStudents /></WithLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tpo/jobs"
          element={
            <ProtectedRoute role="tpo">
              <WithLayout><TPOJobs /></WithLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Company ── */}
        <Route
          path="/company/jobs"
          element={
            <ProtectedRoute role="company">
              <WithLayout><JobManagement /></WithLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/applicants"
          element={
            <ProtectedRoute role="company">
              <WithLayout><ApplicantReview /></WithLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
