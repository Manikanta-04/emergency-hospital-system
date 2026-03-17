import DispatcherDashboard from './pages/DispatcherDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import './styles.css';

export default function App() {
  const path = window.location.pathname;
  if (path === '/hospital') return <HospitalDashboard />;
  if (path === '/analytics') return <AnalyticsDashboard />;
  return <DispatcherDashboard />;
}
