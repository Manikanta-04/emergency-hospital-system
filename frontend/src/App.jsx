import DispatcherDashboard from './pages/DispatcherDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import './styles.css';

export default function App() {
  const isHospital = window.location.pathname === '/hospital';
  return isHospital ? <HospitalDashboard /> : <DispatcherDashboard />;
}
