import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });

export const fetchOrders = (status) =>
  api.get('/orders', { params: status ? { status } : {} }).then((r) => r.data);

export const fetchStats = () => api.get('/orders/stats').then((r) => r.data);

export const resolveAnomaly = (orderId, payload) =>
  api.patch(`/orders/${orderId}/resolve`, payload).then((r) => r.data);

export const generateRoutes = (payload) =>
  api.post('/routes/generate', payload).then((r) => r.data);

export default api;
