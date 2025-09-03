import Constants from 'expo-constants';

// Cached configuration - initialized once
let cachedConfig: { apiBaseUrl: string; platform: 'mobile' } | null = null;
let healthCheckDone = false;

// Centralized server configuration - runs only once
export const getServerConfig = () => {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  // Production vs Development configuration
  const isProduction = !__DEV__ && !Constants.debuggerHost;
  const productionUrl = process.env.EXPO_PUBLIC_API_BASE_URL_PROD;
  
  let apiBaseUrl: string;
  
  if (isProduction && productionUrl) {
    // Production build: use production server
    apiBaseUrl = productionUrl;
    console.log('🚀 Production build detected - using production server');
  } else {
    // Development build: auto-detect server IP
    const debuggerHost = Constants.debuggerHost?.split(':')[0] 
      || Constants.experienceUrl?.match(/exp:\/\/([^:]+)/)?.[1]
      || '192.168.178.147'; // Fallback to local IP
    apiBaseUrl = `http://${debuggerHost}:3001`;
    console.log('🔧 Development build detected - using local server');
  }
    
  cachedConfig = {
    apiBaseUrl,
    platform: 'mobile' as const,
  };
  
  console.log(`🌐 Server config (initialized): ${JSON.stringify(cachedConfig)}`);
  
  // Test network connectivity only once
  if (!healthCheckDone) {
    healthCheckDone = true;
    fetch(`${cachedConfig.apiBaseUrl}/health`)
      .then(res => res.json())
      .then(data => console.log('✅ Server reachable (initial check):', data))
      .catch(err => console.error('❌ Server unreachable (initial check):', err.message));
  }
  
  return cachedConfig;
};

// Get API headers with authentication
export const getApiHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add API key from environment variables if available
  const apiKey = process.env.EXPO_PUBLIC_API_SECRET_KEY;
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  } else {
    console.warn('⚠️ EXPO_PUBLIC_API_SECRET_KEY not found - API requests may fail');
  }
  
  return headers;
};