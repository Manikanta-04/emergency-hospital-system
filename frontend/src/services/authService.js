import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ||
  'https://emergency-hospital-system.onrender.com/api';

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('token');
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')); }
  catch { return null; }
};
export const isLoggedIn = () => !!getToken();
export const getUserRole = () => getUser()?.role || null;

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (email, password) => {
  const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  localStorage.setItem('token', res.data.token);
  localStorage.setItem('user', JSON.stringify(res.data.user));
  return res.data.user;
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// ── Get all users (admin only) ────────────────────────────────────────────────
export const getUsers = async () => {
  const res = await axios.get(`${BASE_URL}/auth/users`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data.users;
};

// ── Create user (admin only) ──────────────────────────────────────────────────
export const createUser = async (userData) => {
  const res = await axios.post(`${BASE_URL}/auth/users`, userData, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data.user;
};

// ── Update user (admin only) ──────────────────────────────────────────────────
export const updateUser = async (id, userData) => {
  const res = await axios.patch(`${BASE_URL}/auth/users/${id}`, userData, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data.user;
};

// ── Delete user (admin only) ──────────────────────────────────────────────────
export const deleteUser = async (id) => {
  await axios.delete(`${BASE_URL}/auth/users/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

// ── Seed default users ────────────────────────────────────────────────────────
export const seedUsers = async () => {
  const res = await axios.post(`${BASE_URL}/auth/seed`);
  return res.data;
};
