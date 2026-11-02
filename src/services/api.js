const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const endpoints = {
  getMachine: (id) => `${API_BASE_URL}/api/v1/machines/${id}`,
  getMachineLatest: (id) => `${API_BASE_URL}/api/v1/machines/${id}/latest`,
  getMachineHistory: (id, limit = 20) => `${API_BASE_URL}/api/v1/machines/${id}/history/recent?limit=${limit}`,
  getMachineAlerts: (id, limit = 5) => `${API_BASE_URL}/api/v1/machines/${id}/alerts?limit=${limit}`,
};

export const getWebSocketUrl = (machineId) => {
  // Convert http/https to ws/wss
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsBase}/ws/v1/machines/${machineId}`;
};

export const fetchApi = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    let errMessage = 'API Error';
    try {
      const err = await response.json();
      errMessage = err.detail || errMessage;
    } catch (e) {}
    throw new Error(errMessage);
  }
  return response.json();
};
