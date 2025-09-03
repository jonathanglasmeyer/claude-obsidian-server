import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, Keyboard } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { SessionsProvider } from './components/SessionsProvider';
import { paperTheme, LightTheme } from './theme';
import { StartNewScreen } from './screens/StartNewScreen';
import { ChatScreen } from './screens/ChatScreen';
import { CustomDrawerContent } from './components/CustomDrawerContent';
import { ProgressiveDrawer } from './components/ProgressiveDrawer';
import { DrawerProvider } from './contexts/DrawerContext';
import { ErrorBoundary } from './ErrorBoundary';


const Stack = createNativeStackNavigator();

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StartNew" component={StartNewScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleDrawerChange = (open: boolean) => {
    // handleDrawerChange called
    try {
      // Dismiss keyboard when opening drawer
      if (open) {
        Keyboard.dismiss();
        // Keyboard dismissed for drawer opening
      }
      setIsDrawerOpen(open);
      // App drawer state changed
    } catch (error) {
      console.error('❌ App drawer state change failed:', error);
      console.error('❌ Error details:', error.name, error.message, error.stack);
      // Don't rethrow to prevent crash
    }
  };

  // Add global error handlers
  React.useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('Warning: Cannot update a component')) {
        // React state update warning intercepted
      }
      originalError.apply(console, args);
    };

    const handleError = (error: any, isFatal: boolean) => {
      // Global error handler triggered
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Auto-detect server IP: Development builds or Expo Go
  const debuggerHost = Constants.debuggerHost?.split(':')[0] 
    || Constants.experienceUrl?.match(/exp:\/\/([^:]+)/)?.[1];
    
  if (!debuggerHost) {
    console.error('❌ No server IP detected - use development build or Expo Go');
  }
  
  const sessionConfig = {
    apiBaseUrl: `http://${debuggerHost}:3001`,
    platform: 'mobile' as const,
  };

  return (
    <>
      <StatusBar style="dark" />
      <SessionsProvider config={sessionConfig}>
        <ErrorBoundary fallback={({ error, retry }) => (
          <View style={{ flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#c33', textAlign: 'center', marginBottom: 16 }}>
              🚨 Drawer System Error
            </Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 8 }}>
              {error.message}
            </Text>
            <Text style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 20 }}>
              This should help us debug the menu button crash
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#dc2626', padding: 12, borderRadius: 8, alignItems: 'center' }}
              onPress={retry}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Restart App</Text>
            </TouchableOpacity>
          </View>
        )}>
          <DrawerProvider isOpen={isDrawerOpen} onOpenChange={handleDrawerChange}>
            <NavigationContainer theme={LightTheme}>
              <ProgressiveDrawer
                isOpen={isDrawerOpen}
                onOpenChange={handleDrawerChange}
                drawerContent={<CustomDrawerContent onClose={() => handleDrawerChange(false)} />}
              >
                <MainStack />
              </ProgressiveDrawer>
            </NavigationContainer>
          </DrawerProvider>
        </ErrorBoundary>
      </SessionsProvider>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <AppContent />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}