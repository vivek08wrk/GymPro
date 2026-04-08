import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
});

// Har request mein automatically token laga do
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const loginAdmin = (data) => API.post('/auth/login', data);

// Members
export const getMembers = () => API.get('/members');
export const getMember = (id) => API.get(`/members/${id}`);
export const createMember = (data) => API.post('/members', data);
export const updateMember = (id, data) => API.put(`/members/${id}`, data);
export const deleteMember = (id) => API.delete(`/members/${id}`);

// Attendance
export const markAttendance = (data) => API.post('/attendance/mark', data);
export const getTodayAttendance = () => API.get('/attendance/today');

// Payments
export const recordPayment = (data) => API.post('/payments', data);
export const getAllPayments = () => API.get('/payments');