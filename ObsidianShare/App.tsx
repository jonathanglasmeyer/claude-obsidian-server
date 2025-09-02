import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { SessionsProvider } from '@obsidian-bridge/shared-components';
import { paperTheme, LightTheme } from './theme';
import { StartNewScreen } from './screens/StartNewScreen';
import { ChatScreen } from './screens/ChatScreen';
import { CustomDrawerContent } from './components/CustomDrawerContent';
import { ProgressiveDrawer } from './components/ProgressiveDrawer';
import { DrawerProvider } from './contexts/DrawerContext';


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
        <DrawerProvider isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <NavigationContainer theme={LightTheme}>
            <ProgressiveDrawer
              isOpen={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              drawerContent={<CustomDrawerContent onClose={() => setIsDrawerOpen(false)} />}
            >
              <MainStack />
            </ProgressiveDrawer>
          </NavigationContainer>
        </DrawerProvider>
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