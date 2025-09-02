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

## Real-World Case Study: Menu Button Crash Investigation

### The Problem We Solved

**Scenario**: Progressive drawer app with menu button in header that crashes immediately when tapped.

**Symptoms**:
- App crashes with no error boundaries catching the issue
- Error message: "onMenuPress is not a function (it is Object)"
- Crash occurs after gesture recognition but before React Context execution
- Error boundaries and comprehensive logging didn't prevent crashes

**Initial Failed Attempts**:
1. ❌ TouchableOpacity → Pan gesture consumed events
2. ❌ Complex error boundaries → Crashes happened in native layer
3. ❌ setTimeout workarounds → Still worklet thread issues  
4. ❌ React state bridges → State setters also failed in worklet
5. ❌ runOnJS() attempts → Import/API errors

### The Root Cause Discovery

**Key insight**: React Native Gesture Handler automatically workletizes callbacks when `react-native-reanimated` is installed, causing:
- Gesture callbacks run on UI thread (worklet)
- React Context functions (useDrawerContext) run on JS thread
- Thread boundary violation → immediate crash

### The Working Solution

```jsx
// ✅ WORKING: ChatHeader.tsx
const menuTapGesture = Gesture.Tap()
  .maxDuration(250)
  .maxDistance(10)
  .runOnJS(true) // 🎯 THE CRITICAL FIX
  .onEnd((event, success) => {
    if (success) {
      onMenuPress(); // Now safe - running on JS thread
    }
  });
```

**Why this specific approach worked**:
- `.runOnJS(true)` forces ALL callbacks to JS thread
- Direct access to React Context without bridging
- Simple, clean architecture
- Compatible with gesture priority systems

### Debugging Journey Lessons

1. **Thread context matters more than React patterns** - Error boundaries can't catch thread violations
2. **Workletization is automatic** - No explicit worklet markers needed with Reanimated
3. **Research over trial-and-error** - Context7 docs provided the exact solution
4. **Simple solutions work best** - Complex state bridges were unnecessary

### Implementation Notes

**Gesture Priority Configuration**:
```jsx
// Pan gesture for drawer opening
const drawerPan = Gesture.Pan()
  .minDistance(15) // Higher threshold to avoid tap conflicts
  .activeOffsetX([-20, 20]) // More tolerance for taps

// Tap gesture for buttons  
const buttonTap = Gesture.Tap()
  .runOnJS(true) // Force JS thread execution
  .maxDuration(250)
  .maxDistance(10)
```

**Error Handling**:
```jsx
.onEnd((event, success) => {
  if (success) {
    try {
      onMenuPress(); // React Context call
    } catch (error) {
      console.error('Callback failed:', error);
      // Error handling on JS thread works normally
    }
  }
})
```

## Debugging Approach

When facing React Native Gesture Handler crashes, follow this systematic approach:

### Phase 1: Isolate the Thread Issue

1. **Add comprehensive logging** to gesture callbacks:
```jsx
const gesture = Gesture.Tap()
  .onStart(() => {
    console.log('🟡 Gesture onStart');
    console.log('🔍 Worklet context:', global._WORKLET);
  })
  .onEnd((event, success) => {
    console.log('🟢 Gesture onEnd - success:', success);
    console.log('🔍 About to call callback...');
    // Callback here - observe if app crashes before/after this log
  });
```

2. **Check where crashes occur** in the log sequence:
   - Before callback = Thread/worklet issue
   - During callback = React Context issue  
   - After callback = State update issue

### Phase 2: Verify Context Availability

Add debugging to consuming components:

```jsx
function ConsumingComponent() {
  const context = useDrawerContext();
  console.log('🔍 Context available:', !!context);
  console.log('🔍 Context methods:', Object.keys(context));
  console.log('🔍 openDrawer type:', typeof context.openDrawer);
  
  return (
    <ChatHeader 
      onMenuPress={() => {
        console.log('🎯 Callback called - context type:', typeof context.openDrawer);
        context.openDrawer();
      }}
    />
  );
}
```

### Phase 3: Test Thread Safety

```jsx
const gesture = Gesture.Tap()
  .onEnd((event, success) => {
    if (success) {
      console.log('🔍 Thread test - _WORKLET:', global._WORKLET);
      
      try {
        // Test direct call
        onMenuPress();
        console.log('✅ Direct call succeeded');
      } catch (error) {
        console.error('❌ Direct call failed:', error.message);
        console.log('🔍 Error suggests thread issue');
      }
    }
  });
```

## Error Patterns and Solutions

### Pattern 1: "X is not a function (it is Object)"
- **Cause**: Function serialization across thread boundaries
- **Solution**: Add `.runOnJS(true)` to gesture configuration

### Pattern 2: App crashes with no error logs
- **Cause**: Native thread crash before JS error handling
- **Solution**: Focus on thread safety, not error handling

### Pattern 3: "Cannot access property X of undefined"  
- **Cause**: Context not available in worklet thread
- **Solution**: Verify context provider setup and thread execution

### Pattern 4: "runOnJS is not defined"
- **Cause**: Import or API usage issues
- **Solution**: Use `.runOnJS(true)` property instead of `runOnJS()` function

## Debugging Tools

### Log Thread Context
```jsx
const debugThreadContext = () => {
  console.log('Thread info:', {
    isWorklet: !!global._WORKLET,
    isJSThread: !global._WORKLET,
    hasRunOnJS: typeof runOnJS !== 'undefined'
  });
};
```

### Gesture State Debugging
```jsx
const gesture = Gesture.Tap()
  .onBegin(() => console.log('🟡 BEGIN'))
  .onStart(() => console.log('🟢 START')) 
  .onEnd(() => console.log('🔴 END'))
  .onFinalize(() => console.log('🏁 FINALIZE'));
```

### Context Validation
```jsx
const validateContext = (context, name) => {
  if (!context) {
    console.error(`❌ ${name} context is null/undefined`);
    return false;
  }
  
  console.log(`✅ ${name} context available:`, Object.keys(context));
  return true;
};
```

## Performance Monitoring

### Gesture Response Time
```jsx
const gesture = Gesture.Tap()
  .onStart(() => {
    console.time('gesture-response');
  })
  .onEnd((event, success) => {
    if (success) {
      console.timeEnd('gesture-response');
      // Typical values: < 16ms for good UX
    }
  });
```

### Thread Execution Time
```jsx
const gesture = Gesture.Tap()
  .runOnJS(true) // Test with/without this
  .onEnd(() => {
    const start = Date.now();
    onMenuPress();
    const duration = Date.now() - start;
    console.log('Callback duration:', duration, 'ms');
  });
```

## Common Debugging Mistakes

### ❌ Don't: Try complex workarounds first
```jsx
// Avoid complex state bridges, timeouts, etc.
setTimeout(() => onMenuPress(), 0); // Still has thread issues
```

### ✅ Do: Test thread safety first  
```jsx
// Simple, direct approach
const gesture = Gesture.Tap()
  .runOnJS(true) // Start here
  .onEnd(() => onMenuPress());
```

### ❌ Don't: Assume error boundaries will help
```jsx
// Error boundaries can't catch native thread crashes
<ErrorBoundary>
  <GestureDetector gesture={crashingGesture}>
```

### ✅ Do: Fix the thread issue at source
```jsx  
// Fix the root cause
const gesture = Gesture.Tap()
  .runOnJS(true) // Prevents crashes entirely
```

## Validation Checklist

Before considering your gesture integration complete:

- [ ] Tested on both debug and release builds
- [ ] Verified with Metro cache cleared (`npx expo start --clear`)
- [ ] Confirmed gesture works after multiple interactions  
- [ ] Tested alongside other gestures (pan, scroll, etc.)
- [ ] Performance tested (< 16ms response time)
- [ ] Error handling works for React Context failures
- [ ] No memory leaks (listeners properly cleaned up)

## Summary

The fundamental issue is **thread safety**. React Native Gesture Handler runs callbacks on the UI thread by default (when Reanimated is installed), but React Context lives on the JS thread. The safest solution is `.runOnJS(true)` to force callbacks onto the JS thread where React Context is accessible.

**Key takeaway**: When React Native Gesture Handler + React Context integration fails, it's almost always a thread safety issue, not a React pattern problem. Use `.runOnJS(true)` first, debug second.

## Research Resources

When debugging fails, research these topics:

1. **React Native Gesture Handler worklet documentation**
2. **react-native-reanimated threading model**  
3. **Context7 lookup for specific gesture patterns**
4. **Official examples in gesture handler repository**

Remember: Most gesture + context issues are **thread safety problems**, not React patterns problems. Research thread safety solutions first.