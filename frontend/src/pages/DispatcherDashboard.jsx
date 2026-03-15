import { useState } from 'react';
import EmergencyForm from '../components/EmergencyForm';
import HospitalMap from '../components/HospitalMap';
import RecommendationPanel from '../components/RecommendationPanel';
import HospitalCard from '../components/HospitalCard';
import AlertStatus from '../components/AlertStatus';
import { getRecommendation, sendAlert, retryAlert } from '../services/api';

export default function DispatcherDashboard() {
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [emergencyData, setEmergencyData] = useState(null);
  const [alertStatus, setAlertStatus] = useState(null);
  const [showRoute, setShowRoute] = useState(false);
  const [error, setError] = useState('');
  // ✅ Fix 1: Track user location for map centering
  const [userLocation, setUserLocation] = useState(null);

  const handleFormSubmit = async ({ emergencyType, patientCount, lat, lng }) => {
    setLoading(true);
    setError('');
    setAlertStatus(null);
    try {
      const res = await getRecommendation(emergencyType, lat, lng, patientCount);
      const data = res.data;
      setRecommendation(data.recommendation);
      setHospitals(data.allRanked);
      setEmergencyData({ emergencyType, patientCount, lat, lng });
      setStep('results');
    } catch (err) {
      if (!navigator.onLine || err.code === 'ECONNABORTED') {
        setError('⚠️ Offline mode — showing cached data');
        import('../data/mockHospitals').then(({ MOCK_HOSPITALS }) => {
          setHospitals(MOCK_HOSPITALS.map((h, i) => ({ ...h, rank: i + 1, score: 90 - i * 10, etaMinutes: Math.ceil(h.distanceKm / 25 * 60) })));
          setRecommendation({ ...MOCK_HOSPITALS[0], hospitalId: MOCK_HOSPITALS[0]._id, score: 90, etaMinutes: 8 });
          setEmergencyData({ emergencyType, patientCount, lat, lng });
          setStep('results');
        });
      } else {
        setError(err.response?.data?.error || 'Failed to get recommendation. Is the server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlert = async (hospitalId, isRetry = false) => {
    setAlertStatus({ loading: true });
    try {
      let res;
      if (isRetry && alertStatus?.alertLogId) {
        res = await retryAlert(alertStatus.alertLogId);
      } else {
        res = await sendAlert({
          hospitalId,
          emergencyType: emergencyData.emergencyType,
          eta: recommendation?.etaMinutes || 10,
          patientLocation: { lat: emergencyData.lat, lng: emergencyData.lng },
          patientCount: emergencyData.patientCount,
          wasManualOverride: hospitalId !== recommendation?.hospitalId,
          aiRecommendedHospitalId: recommendation?.hospitalId,
        });
      }
      const data = res.data;
      if (data.webhookStatus === 'sent') {
        setAlertStatus({ sent: true, alertLogId: data.alertLogId, message: data.message });
        setShowRoute(true);
      } else {
        setAlertStatus({ failed: true, alertLogId: data.alertLogId, error: data.webhookError, canRetry: data.canRetry });
      }
    } catch (err) {
      setAlertStatus({ failed: true, error: err.response?.data?.error || 'Alert dispatch failed', canRetry: true });
    }
  };

  const handleReset = () => {
    setStep('form');
    setShowRoute(false);
    setHospitals([]);
    setRecommendation(null);
    setEmergencyData(null);
    setAlertStatus(null);
    setError('');
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="header-left">
          <div className="logo">🚑</div>
          <div>
            <h1 className="header-title">Emergency Dispatch</h1>
            <p className="header-sub">AI-Powered Hospital Routing System</p>
          </div>
        </div>
        <div className="header-right">
          <div className="live-badge">
            <span className="live-dot" />
            LIVE
          </div>
          <a href="/hospital" className="reset-btn" style={{ textDecoration: 'none' }}>
            🏥 Hospital View →
          </a>
          {step === 'results' && (
            <button className="reset-btn" onClick={handleReset}>← New Emergency</button>
          )}
        </div>
      </header>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {step === 'form' ? (
        <div className="form-layout">
          <div className="form-left">
            <EmergencyForm
              onSubmit={handleFormSubmit}
              loading={loading}
              onLocationDetected={setUserLocation}
            />
          </div>
          <div className="form-right">
            {/* ✅ Fix 1: Pass userLocation to map so it centers correctly */}
            <HospitalMap hospitals={[]} userLocation={userLocation} />
          </div>
        </div>
      ) : (
        <div className="results-layout">
          <div className="results-left">
            <RecommendationPanel
              recommendation={recommendation}
              emergencyType={emergencyData?.emergencyType}
              onSendAlert={handleSendAlert}
              alertStatus={alertStatus}
            />
            <AlertStatus
              status={alertStatus}
              onRetry={() => handleSendAlert(recommendation?.hospitalId, true)}
            />
            <div className="all-hospitals">
              <h3 className="all-title">All Ranked Hospitals ({hospitals.length})</h3>
              {hospitals.map((h, i) => (
                <HospitalCard
                  key={h.hospitalId || h._id}
                  hospital={h}
                  rank={i + 1}
                  isRecommended={i === 0}
                  onSelect={(h) => { if (!alertStatus?.sent) handleSendAlert(h.hospitalId || h._id); }}
                />
              ))}
            </div>
          </div>
          <div className="results-right">
            <HospitalMap
              hospitals={hospitals}
              recommendation={recommendation}
              userLocation={emergencyData}
              showRoute={showRoute}
            />
          </div>
        </div>
      )}
    </div>
  );
}
