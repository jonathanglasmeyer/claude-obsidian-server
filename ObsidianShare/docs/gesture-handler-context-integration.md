# React Native Gesture Handler + React Context Integration Best Practices

## The Core Problem: Thread Safety Issues

Your crashes are likely caused by **thread safety violations** when trying to call React Context functions from gesture handler callbacks. React Native Gesture Handler runs callbacks on different threads depending on configuration, leading to crashes when accessing React Context improperly.

## Critical Understanding: Worklet vs JS Thread Architecture

### Default Behavior (with react-native-reanimated installed)
- **Gesture callbacks are automatically "workletized"** and run on the **UI thread**
- **React Context functions run on the JS thread** 
- **Direct calls from UI thread to JS thread functions CRASH the app**

### Thread Safety Rules
1. **UI Thread (worklets)**: Fast, optimized for animations, but LIMITED access to React APIs
2. **JS Thread**: Full React access, but slower for animations
3. **Cross-thread calls require explicit bridging** via `runOnJS()` or `.runOnJS(true)`

## SOLUTION 1: Force Callbacks to Run on JS Thread (Recommended)

Use the `.runOnJS(true)` property to force ALL gesture callbacks to run on the JavaScript thread:

```jsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDrawerContext } from './DrawerContext';

function HeaderComponent() {
  const { toggleDrawer } = useDrawerContext(); // This is a React Context function

  const tapGesture = Gesture.Tap()
    .runOnJS(true) // ✅ CRITICAL: Forces callback to run on JS thread
    .onStart(() => {
      toggleDrawer(); // ✅ Now safe to call React Context directly
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={styles.header}>
        {/* Your header content */}
      </View>
    </GestureDetector>
  );
}
```

### Why This Works
- `.runOnJS(true)` overrides the default workletization
- All callbacks run on JS thread where React Context is accessible
- No thread boundaries to cross = no crashes

## SOLUTION 2: Use runOnJS() Bridge Function

If you need the performance benefits of UI thread execution for other parts of your gesture, use `runOnJS()` to safely call React functions:

```jsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useDrawerContext } from './DrawerContext';

function HeaderComponent() {
  const { toggleDrawer } = useDrawerContext();

  // Create a wrapper function on JS thread
  const handleToggleDrawer = () => {
    toggleDrawer();
  };

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet'; // Explicitly mark as worklet (optional, auto-detected)
      // ✅ Use runOnJS to bridge from UI thread to JS thread
      runOnJS(handleToggleDrawer)();
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={styles.header}>
        {/* Your header content */}
      </View>
    </GestureDetector>
  );
}
```

### Critical runOnJS() Rules
1. **Function must be defined in JS thread scope** (component body, not inside worklet)
2. **Pass arguments correctly**: `runOnJS(func)(args)` NOT `runOnJS(func(args))()`
3. **Cannot define function inside UI thread callback** - will crash

## SOLUTION 3: State Bridge Pattern

For complex scenarios, use React state to bridge the thread gap:

```jsx
import { useState, useEffect } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useDrawerContext } from './DrawerContext';

function HeaderComponent() {
  const { toggleDrawer } = useDrawerContext();
  const shouldToggle = useSharedValue(false);

  // React effect on JS thread monitors shared value changes
  useEffect(() => {
    const unsubscribe = shouldToggle.addListener((value) => {
      if (value) {
        toggleDrawer(); // Safe to call from React effect
        shouldToggle.value = false; // Reset trigger
      }
    });

    return unsubscribe;
  }, [toggleDrawer, shouldToggle]);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      // ✅ Just flip a flag on UI thread, React handles the rest
      shouldToggle.value = true;
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={styles.header}>
        {/* Your header content */}
      </View>
    </GestureDetector>
  );
}
```

## Common Anti-Patterns That WILL Crash

### ❌ Direct Context Call from Worklet
```jsx
const tapGesture = Gesture.Tap()
  .onStart(() => {
    toggleDrawer(); // 💥 CRASH: UI thread trying to call JS thread function
  });
```

### ❌ Function Defined Inside Worklet
```jsx
const tapGesture = Gesture.Tap()
  .onStart(() => {
    'worklet';
    const myFunction = () => toggleDrawer(); // 💥 Function defined on UI thread
    runOnJS(myFunction)(); // 💥 CRASH: runOnJS can't use UI-thread-defined functions
  });
```

### ❌ Wrong runOnJS Syntax
```jsx
// 💥 WRONG:
runOnJS(toggleDrawer())(); // Calls function immediately, passes result to runOnJS

// ✅ CORRECT:
runOnJS(toggleDrawer)(); // Passes function reference, runOnJS calls it safely
```

## Detecting Thread Context

Use these techniques to debug thread issues:

```jsx
const tapGesture = Gesture.Tap()
  .onStart(() => {
    console.log('Am I a worklet?', global._WORKLET); // true = UI thread, undefined/false = JS thread
    
    if (global._WORKLET) {
      // Running on UI thread - need runOnJS for React calls
      runOnJS(toggleDrawer)();
    } else {
      // Running on JS thread - safe to call React directly
      toggleDrawer();
    }
  });
```

## Performance Considerations

| Approach | Performance | React Access | Complexity |
|----------|------------|--------------|------------|
| `.runOnJS(true)` | Lower (JS thread) | Full | Low ✅ |
| `runOnJS()` bridge | Higher (UI thread) | Bridged | Medium |
| State bridge | Highest (UI thread) | Async | High |

## Recommended Architecture

For most UI interactions involving React Context:

1. **Start with `.runOnJS(true)`** - simplest and safest
2. **Use `runOnJS()` bridge** only if you need UI thread performance for animations
3. **Use state bridge** only for complex async scenarios

## Troubleshooting Checklist

If you're still experiencing crashes:

- [ ] Added `.runOnJS(true)` to gesture configuration?
- [ ] Are context functions defined in component scope (not inside callbacks)?
- [ ] Using correct `runOnJS(func)(args)` syntax?
- [ ] Verified thread context with `global._WORKLET`?
- [ ] Wrapped app with `GestureHandlerRootView`?
- [ ] No setTimeout/setInterval inside worklets?

## Alternative: Avoid Gesture Handler for Simple Taps

If you only need basic tap handling, consider using React Native's built-in `Pressable`:

```jsx
import { Pressable } from 'react-native';
import { useDrawerContext } from './DrawerContext';

function HeaderComponent() {
  const { toggleDrawer } = useDrawerContext();

  return (
    <Pressable onPress={toggleDrawer}>
      <View style={styles.header}>
        {/* Your header content */}
      </View>
    </Pressable>
  );
}
```

**Use Gesture Handler when you need:**
- Complex gestures (pan, pinch, rotation)
- Multiple simultaneous gestures
- High-performance animations
- Custom gesture recognition

**Use Pressable when you need:**
- Simple tap handling
- Direct React Context access
- Simpler architecture

## Summary

The fundamental issue is **thread safety**. React Native Gesture Handler runs callbacks on the UI thread by default (when Reanimated is installed), but React Context lives on the JS thread. The safest solution is `.runOnJS(true)` to force callbacks onto the JS thread where React Context is accessible.