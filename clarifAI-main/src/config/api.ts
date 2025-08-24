// API Configuration for Netlify + Render deployment
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-backend-app.onrender.com'  // Replace with your Render URL
  : 'http://localhost:3001';

export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`;
};