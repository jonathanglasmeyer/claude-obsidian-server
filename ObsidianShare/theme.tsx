import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import { DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

// Material Design 3 Theme
const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Customize colors if needed
  },
};

// Adapted Navigation Theme
const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  materialLight: paperTheme,
});

// Add missing fonts property to Navigation Theme
const enhancedLightTheme = {
  ...LightTheme,
  fonts: NavigationDefaultTheme.fonts,
};

export { paperTheme, enhancedLightTheme as LightTheme };