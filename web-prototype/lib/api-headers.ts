// Utility for consistent API headers with authentication
export const getApiHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  // Add API key from environment if available
  if (process.env.API_SECRET_KEY) {
    headers['x-api-key'] = process.env.API_SECRET_KEY;
  } else {
    console.warn('⚠️ API_SECRET_KEY not found - API request may fail');
  }
  
  return headers;
};