import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://gym-backend-bykv.onrender.com/api'
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
export const toggleMemberStatus = (id) => API.patch(`/members/${id}/toggle-status`);
export const sendMotivationalMessage = (id) => API.post(`/members/${id}/send-motivation`);

// Attendance
export const markAttendance = (data) => API.post('/attendance/mark', data);
export const getTodayAttendance = () => API.get('/attendance/today');
export const markManualAttendance = (data) => API.post('/attendance/manual', data);
export const searchMembers = (query) => API.get(`/attendance/search?query=${query}`);
export const getMemberAttendanceByDate = (memberId, date) => API.get(`/attendance/by-date?memberId=${memberId}&date=${date}`);
export const getMemberAttendanceByDateRange = (memberId, startDate, endDate) => API.get(`/attendance/by-date-range?memberId=${memberId}&startDate=${startDate}&endDate=${endDate}`);
export const getAttendanceByDate = (date) => API.get(`/attendance/date-query?date=${date}`);
export const getMemberMonthlySummary = (memberId, year, month) => API.get(`/attendance/monthly-summary?memberId=${memberId}&year=${year}&month=${month}`);

// Payments
export const recordPayment = (data) => API.post('/payments', data);
export const getAllPayments = () => API.get('/payments');
export const getMemberProgress = (memberId) => API.get(`/progress/${memberId}`);
export const addMemberProgress = (data) => API.post('/progress', data);
export const getPaymentStats = () => API.get('/payments/stats');
export const getAttendanceStats = () => API.get('/attendance/stats');

// RAG / Chatbot / AI
export const uploadPDF = (formData) => API.post('/rag/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const askQuestion = (data) => API.post('/rag/ask', data);
export const adminInsight = (data) => API.post('/rag/admin-insight', data);
export const listDocuments = () => API.get('/rag/documents');
export const deleteDocument = (id) => API.delete(`/rag/documents/${id}`);
export const queryAttendance = (data) => API.post('/rag/attendance-query', data);