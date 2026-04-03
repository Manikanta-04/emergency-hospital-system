import { useState } from 'react';
import DispatcherDashboard from './pages/DispatcherDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import AmbulanceTracker from './pages/AmbulanceTracker';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import IntroVideo from './components/IntroVideo';
import { isLoggedIn, getUserRole } from './services/authService';
import './styles.css';

export default function App() {
  const path = window.location.pathname;

  // ── Intro state FIRST (must be before using it) ────────────────────────────
  const [introShown, setIntroShown] = useState(
    () => sessionStorage.getItem('introShown') === 'true'
  );

  const handleIntroFinish = () => {
    sessionStorage.setItem('introShown', 'true');
    setIntroShown(true);
  };

  // ── Public routes — no login, no intro ────────────────────────────────────
  if (path.startsWith('/track/')) return <AmbulanceTracker />;

  // ✅ FIXED CONDITION (now works correctly)
  if (path === '/login' && introShown) return <LoginPage />;

  // ── Show intro video only on first visit ──────────────────────────────────
  if (!introShown) {
    return <IntroVideo onFinish={handleIntroFinish} />;
  }

  // ── Auth check ─────────────────────────────────────────────────────────────
  if (!isLoggedIn()) {
    window.location.href = '/login';
    return null;
  }

  const role = getUserRole();

  // ── Role-based routing ─────────────────────────────────────────────────────
  if (path === '/admin') {
    if (role !== 'admin') { window.location.href = '/'; return null; }
    return <AdminPanel />;
  }

  if (path === '/hospital') {
    if (role !== 'hospital' && role !== 'admin') {
      window.location.href = '/';
      return null;
    }
    return <HospitalDashboard />;
  }

  if (path === '/analytics') return <AnalyticsDashboard />;

  // ── Default: Dispatcher ────────────────────────────────────────────────────
  if (role === 'hospital') {
    window.location.href = '/hospital';
    return null;
  }

  return <DispatcherDashboard />;
}