import DispatcherDashboard from './pages/DispatcherDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import AmbulanceTracker from './pages/AmbulanceTracker';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import { isLoggedIn, getUserRole, logout } from './services/authService';
import './styles.css';

export default function App() {
  const path = window.location.pathname;

  // ── Public routes (no login needed) ────────────────────────────────────────
  if (path.startsWith('/track/')) return <AmbulanceTracker />;
  if (path === '/login') return <LoginPage />;

  // ── Auth check ──────────────────────────────────────────────────────────────
  if (!isLoggedIn()) {
    window.location.href = '/login';
    return null;
  }

  const role = getUserRole();

  // ── Role-based routing ──────────────────────────────────────────────────────
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

  if (path === '/analytics') {
    return <AnalyticsDashboard />;
  }

  // ── Default: Dispatcher (dispatcher + admin can access) ─────────────────────
  if (role === 'hospital') {
    window.location.href = '/hospital';
    return null;
  }

  return <DispatcherDashboard />;
}
