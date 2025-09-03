# React Native Screens Crash Research
## ViewManagerResolver returned null for RNSScreenContentWrapper

### Error Description
**Crash Error:**
```
ViewManagerResolver returned null for either RNSScreenContentWrapper or RCTRNSScreenContentWrapper
```

**Context:**
- Expo React Native app with production build
- Using @react-navigation/native-stack
- Crashes immediately on app start in release builds
- Works fine in Expo Go development
- React Native Fabric/New Architecture enabled

---

## Root Cause Analysis

### 1. ViewManager Registration Issues
**Problem:** The `RNSScreenContentWrapper` ViewManager is not being properly registered in the production build's ViewManagerRegistry.

**Technical Details:**
- In Fabric/New Architecture, ViewManagers must be explicitly registered
- The `react-native-screens` library provides native screen components
- Production builds have different autolinking behavior than development builds
- Expo managed workflow may handle ViewManager registration differently than bare workflow

### 2. Autolinking Failures in Production
**Problem:** Native modules may not be properly autolinked in production builds.

**Evidence from Documentation:**
- `react-native-screens` requires proper native integration
- Expo managed workflow uses different autolinking than React Native CLI
- New Architecture requires specific CMake and Fabric configuration
- Production builds may skip certain development-only configurations

### 3. Fabric/New Architecture Compatibility
**Problem:** `react-native-screens` integration with Fabric architecture may be incomplete.

**Technical Details:**
- New Architecture requires different ViewManager registration
- CMake configuration must handle both old and new architecture
- Fabric components need proper C++ bridging
- Production builds enforce stricter native module requirements

---

## Solutions & Workarounds

### Solution 1: Fix Dependencies Installation
**For Expo Managed Workflow:**
```bash
# Install all required dependencies
npx expo install react-native-screens react-native-safe-area-context

# Ensure navigation dependencies
npx expo install @react-navigation/native @react-navigation/native-stack

# Additional requirements for advanced features
npx expo install react-native-gesture-handler react-native-reanimated
```

**For Bare React Native:**
```bash
# Install dependencies
npm install react-native-screens react-native-safe-area-context
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-gesture-handler react-native-reanimated

# iOS additional step
cd ios && pod install && cd ..

# Android rebuild
./gradlew clean
npx react-native run-android
```

### Solution 2: Enable Screens Properly
**Add to your main App.js/App.tsx:**
```javascript
import { enableScreens } from 'react-native-screens';

// Enable native screens BEFORE rendering any navigation
enableScreens();

// For Expo Go, screens are enabled by default
// But for production builds, explicit enablement may be required
```

### Solution 3: Android MainActivity Configuration
**Modify MainActivity.kt/MainActivity.java:**
```kotlin
// MainActivity.kt
import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Fix for react-native-screens
        super.onCreate(null)
    }
    
    override fun getMainComponentName(): String = "YourAppName"
}
```

```java
// MainActivity.java
import android.os.Bundle;

public class MainActivity extends ReactActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(null); // Pass null to fix state persistence issues
    }
}
```

### Solution 4: New Architecture Configuration
**For apps with New Architecture enabled:**

**app.json/app.config.js:**
```json
{
  "expo": {
    "newArchEnabled": true
  }
}
```

**If issues persist, disable New Architecture:**
```json
{
  "expo": {
    "newArchEnabled": false
  }
}
```

**For bare workflow, check gradle.properties:**
```properties
# Disable New Architecture if problematic
newArchEnabled=false
```

### Solution 5: Expo Development Build
**If managed workflow fails, try development build:**
```bash
# Create development build
npx expo prebuild
npx expo run:android

# Or use EAS Build
eas build --platform android --profile development
```

### Solution 6: Manual ViewManager Registration
**For bare workflow with persistent issues:**

**MainApplication.java:**
```java
@Override
protected List<ReactPackage> getPackages() {
    @SuppressWarnings("UnnecessaryLocalVariable")
    List<ReactPackage> packages = new PackageList(this).getPackages();
    
    // Manual registration if autolinking fails
    // packages.add(new RNScreensPackage());
    
    return packages;
}
```

---

## Troubleshooting Steps

### Step 1: Verify Dependencies
```bash
# Check installed versions
npm list react-native-screens
npm list @react-navigation/native-stack

# Verify expo-doctor compatibility
npx expo-doctor@latest
```

### Step 2: Clean Rebuild
```bash
# Clean all caches
npx expo start --clear

# For bare workflow
npx react-native start --reset-cache
cd android && ./gradlew clean && cd ..
```

### Step 3: Check Autolinking
```bash
# Verify autolinking resolution
npx expo-modules-autolinking search
npx expo-modules-autolinking resolve --platform android
```

### Step 4: Test Architecture Compatibility
```bash
# Check if New Architecture is causing issues
# Temporarily disable in app.json
{
  "expo": {
    "newArchEnabled": false
  }
}
```

---

## Alternative Solutions

### Option 1: Use Stack Navigator instead of Native Stack
```javascript
// Switch from @react-navigation/native-stack
import { createStackNavigator } from '@react-navigation/stack';

// This uses JS-based transitions instead of native screens
const Stack = createStackNavigator();
```

### Option 2: Disable react-native-screens
```javascript
import { enableScreens } from 'react-native-screens';

// Disable native screen optimization
enableScreens(false);
```

---

## Library Compatibility Matrix

| Library Version | React Native | Expo SDK | New Architecture | Status |
|-----------------|--------------|----------|------------------|--------|
| react-native-screens@3.29+ | 0.72+ | SDK 50+ | Supported | ✅ Stable |
| react-native-screens@3.25+ | 0.70+ | SDK 49+ | Partial | ⚠️ Issues reported |
| @react-navigation/native-stack@6.9+ | 0.72+ | SDK 50+ | Supported | ✅ Recommended |

---

## Known Issues & Limitations

### Expo Managed Workflow
- New Architecture support may be incomplete in older SDK versions
- Some ViewManagers may not register properly in production builds
- Expo Go vs. production build behavior differences

### React Native New Architecture
- TurboModules and Fabric require explicit ViewManager registration
- Legacy interop layer may cause registration failures
- CMake configuration must be correct for both architectures

### Production Build Differences
- Development builds are more permissive with native modules
- Production builds enforce stricter ViewManager requirements
- Hermes engine may affect native module loading

---

## Recommended Action Plan

### For Expo Projects:
1. **Update to Latest Expo SDK** (SDK 52+)
2. **Use Latest react-native-screens** (3.29+)
3. **Enable proper screen initialization** in App.js
4. **Test with development build** before production
5. **Consider disabling New Architecture** if issues persist

### For Bare React Native:
1. **Verify all dependencies** are properly installed and linked
2. **Update MainActivity** configuration for screens
3. **Check CMake configuration** for Fabric compatibility
4. **Test autolinking resolution** manually
5. **Consider manual package registration** if autolinking fails

### Emergency Workarounds:
1. **Disable New Architecture** temporarily
2. **Use @react-navigation/stack** instead of native-stack
3. **Disable react-native-screens** optimization
4. **Switch to Expo development build** if managed workflow fails

---

## References

1. [React Native Screens Official Documentation](https://docs.swmansion.com/react-native-screens/)
2. [React Navigation Native Stack Documentation](https://reactnavigation.org/docs/native-stack-navigator)
3. [Expo New Architecture Guide](https://docs.expo.dev/guides/new-architecture/)
4. [React Native Fabric Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
5. [Recent Stack Overflow discussions (December 2024)](https://stackoverflow.com/questions/tagged/react-native-screens)

---

**Last Updated:** January 2025
**Status:** Active research - solutions evolving with React Native 0.75+ and Expo SDK 52+