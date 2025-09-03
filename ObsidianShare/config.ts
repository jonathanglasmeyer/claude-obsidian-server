import Constants from 'expo-constants';

// Cached configuration - initialized once
let cachedConfig: { apiBaseUrl: string; platform: 'mobile' } | null = null;
let healthCheckDone = false;

// Centralized server configuration - runs only once
export const getServerConfig = () => {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  // Auto-detect server IP: Development builds or Expo Go, with production fallback
  const debuggerHost = Constants.debuggerHost?.split(':')[0] 
    || Constants.experienceUrl?.match(/exp:\/\/([^:]+)/)?.[1]
    || '192.168.178.147'; // Fallback to local IP for production builds
    
  cachedConfig = {
    apiBaseUrl: `http://${debuggerHost}:3001`,
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