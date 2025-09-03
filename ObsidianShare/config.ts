import Constants from 'expo-constants';

// Centralized server configuration
export const getServerConfig = () => {
  // Auto-detect server IP: Development builds or Expo Go, with production fallback
  const debuggerHost = Constants.debuggerHost?.split(':')[0] 
    || Constants.experienceUrl?.match(/exp:\/\/([^:]+)/)?.[1]
    || '192.168.178.147'; // Fallback to local IP for production builds
    
  const config = {
    apiBaseUrl: `http://${debuggerHost}:3001`,
    platform: 'mobile' as const,
  };
  
  // Test network connectivity immediately
  fetch(`${config.apiBaseUrl}/health`)
    .then(res => res.json())
    .then(data => console.log('✅ Server reachable:', data))
    .catch(err => console.error('❌ Server unreachable:', err.message));
  
  console.log(`🌐 Server config: ${JSON.stringify(config)}`);
  
  return config;
};