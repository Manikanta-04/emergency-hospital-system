import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export const getHospitals = () => api.get('/hospitals');

export const getNearbyHospitals = (lat, lng, radius = 20) =>
  api.get(`/hospitals/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);

export const getRecommendation = (emergencyType, lat, lng, patientCount = 1) =>
  api.post('/recommend', { emergencyType, lat, lng, patientCount });

export const sendAlert = (payload) => api.post('/alert', payload);

export const retryAlert = (alertLogId) => api.post(`/alert/${alertLogId}/retry`);

export default api;
