// API Configuration for Netlify + Render deployment
export const API_BASE_URL = import.meta.env.PROD 
  ? window.location.origin  // Use same domain in production
  : 'http://localhost:3001';

export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`;
};