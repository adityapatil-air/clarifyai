// API configuration for different environments

const API_URLS = {
  development: 'http://localhost:3001',
  production: 'https://clarifyai-470v.onrender.com'
};

export const getApiUrl = (endpoint: string = '') => {
  const baseUrl = import.meta.env.VITE_API_URL || 
                  API_URLS[import.meta.env.MODE as keyof typeof API_URLS] || 
                  API_URLS.production;
  
  return `${baseUrl}${endpoint}`;
};

export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  PROCESS_DATA: '/api/process-data',
  UPLOAD_PROCESS: '/api/upload-and-process'
};