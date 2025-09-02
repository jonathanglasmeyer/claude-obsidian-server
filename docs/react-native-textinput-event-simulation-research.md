# React Native TextInput Native Methods & Event Simulation Research

## Overview
Research findings on React Native TextInput ref methods, native event dispatching, and programmatic event simulation to trigger complete event flow including KeyboardAvoidingView behavior.

## 1. TextInput Ref Methods

### Available Native Methods
React Native TextInput exposes these methods via refs:

```javascript
import React, { useRef } from 'react';
import { TextInput } from 'react-native';

const textInputRef = useRef(null);

// Available methods:
textInputRef.current?.focus();           // Request focus
textInputRef.current?.blur();            // Remove focus  
textInputRef.current?.clear();           // Clear content
textInputRef.current?.isFocused();       // Returns boolean - check focus state
```

### Method Details

#### `focus()`
- **Purpose**: Requests focus for the native input element
- **Event Trigger**: ❌ Does NOT trigger onFocus handlers
- **KeyboardAvoidingView**: ❌ Does NOT trigger natural keyboard behavior
- **Usage**: Programmatic focus without event flow

#### `blur()`
- **Purpose**: Removes focus from the native input element  
- **Event Trigger**: ❌ Does NOT trigger onBlur handlers
- **KeyboardAvoidingView**: ❌ Does NOT trigger natural keyboard behavior
- **Usage**: Programmatic blur without event flow

#### `clear()`
- **Purpose**: Clears the text content of the input
- **Event Trigger**: ❌ Does NOT trigger onChangeText or other handlers
- **Usage**: Direct content manipulation

#### `isFocused(): boolean`
- **Purpose**: Returns current focus state
- **Usage**: Check if input is currently focused

### Key Limitation
**The core issue**: Standard ref methods (`focus()`, `blur()`) do NOT trigger the natural event flow that includes:
- onFocus/onBlur event handlers
- KeyboardAvoidingView adjustments
- Native gesture system integration

## 2. React Native Event System Architecture

### Event Flow Overview
React Native uses a gesture responder system where events flow through:

1. **Native Layer** → Generates touch/focus events
2. **Bridge** → Transfers events to JavaScript
3. **React Native Event System** → Processes and dispatches events
4. **Component Handlers** → onFocus, onBlur, etc.

### Touch Event Structure
```javascript
evt.nativeEvent {
  changedTouches: [],
  identifier: '',
  locationX: 0,
  locationY: 0,
  pageX: 0,
  pageY: 0,
  target: 0,
  timestamp: 0,
  touches: []
}
```

### Gesture Responder Methods
```javascript
// Responder negotiation
onStartShouldSetResponder: evt => boolean
onMoveShouldSetResponder: evt => boolean

// Responder lifecycle  
onResponderGrant: evt => {}      // Becomes responder
onResponderMove: evt => {}       // Touch moves
onResponderRelease: evt => {}    // Touch ends
onResponderTerminate: evt => {}  // Responder lost
```

## 3. Event Simulation Approaches

### A. React Native Testing Library (RNTL)
**Best approach for testing scenarios**

#### fireEvent API
```javascript
import { fireEvent, render, screen } from '@testing-library/react-native';

// Direct event firing
fireEvent(element, 'focus');  // Triggers onFocus
fireEvent(element, 'blur');   // Triggers onBlur
fireEvent.changeText(element, 'new text'); // Triggers onChangeText

// With event data
fireEvent.press(element, {
  nativeEvent: {
    pageX: 20,
    pageY: 30,
  }
});
```

#### userEvent API (Realistic Event Sequences)
```javascript
import { userEvent } from '@testing-library/react-native';

const user = userEvent.setup();

// Simulates complete user interaction flow
await user.type(textInput, 'Hello world!', {
  skipPress: false,  // Include pressIn/pressOut
  skipBlur: false,   // Include endEditing/blur  
  submitEditing: false
});

// Full event sequence: focus → selectionChange → keyPress → 
// change → changeText → endEditing → blur

await user.clear(textInput);  // Focus → select all → clear → blur
await user.paste(textInput, 'text'); // Focus → paste → blur
```

### B. Native Event Dispatching (Advanced)
**For custom native modules only**

#### From Native to JavaScript
```java
// Java/Android
WritableMap event = Arguments.createMap();
event.putString("message", "MyMessage");
ReactContext reactContext = (ReactContext)getContext();
reactContext
  .getJSModule(RCTEventEmitter.class)
  .receiveEvent(getId(), "topChange", event);
```

```kotlin
// Kotlin/Android  
val event = Arguments.createMap().apply {
  putString("message", "MyMessage")
}
val reactContext = context as ReactContext
reactContext
  .getJSModule(RCTEventEmitter::class.java)
  .receiveEvent(id, "topChange", event)
```

### C. Touch Simulation via Gesture System
**Theoretical approach - complex implementation**

```javascript
// Would require creating synthetic touch events
const syntheticTouchEvent = {
  nativeEvent: {
    touches: [{ 
      identifier: 1,
      locationX: x,
      locationY: y,
      pageX: x,
      pageY: y,
      target: elementId,
      timestamp: Date.now()
    }],
    changedTouches: [/* same as above */]
  }
};

// This approach is not readily available in standard React Native
```

## 4. Practical Solutions

### For Testing (Recommended)
Use React Native Testing Library's `fireEvent` or `userEvent`:

```javascript
import { fireEvent, render, screen } from '@testing-library/react-native';

// Simple event trigger
const textInput = screen.getByPlaceholderText('Enter text');
fireEvent(textInput, 'focus');  // ✅ Triggers onFocus + KeyboardAvoidingView

// Realistic user interaction
const user = userEvent.setup();
await user.type(textInput, 'Hello'); // ✅ Full event sequence
```

### For Production Code (Limited Options)
**Current React Native limitations:**
- No built-in `dispatchEvent` API
- No synthetic event creation utilities  
- Ref methods don't trigger event handlers

**Workarounds:**
```javascript
// Manual handler invocation (not ideal)
const handleFocus = () => {
  textInputRef.current?.focus();
  onFocus?.({ nativeEvent: { /* mock data */ } });
};

// State-based approach  
const [shouldFocus, setShouldFocus] = useState(false);

useEffect(() => {
  if (shouldFocus) {
    textInputRef.current?.focus();
    setShouldFocus(false);
  }
}, [shouldFocus]);

// Trigger via state
setShouldFocus(true);
```

## 5. KeyboardAvoidingView Integration

### Why Standard focus() Doesn't Work
KeyboardAvoidingView listens for:
- Native keyboard events
- onFocus handlers that indicate "real" user interaction
- Layout changes from native keyboard appearance

Using `textInputRef.current.focus()` bypasses this event flow.

### Solutions for KeyboardAvoidingView
1. **Use RNTL fireEvent in tests** - triggers complete flow
2. **Simulate user touch** - if touch simulation becomes available
3. **Manual KeyboardAvoidingView trigger** - custom implementation
4. **Alternative libraries** - react-native-keyboard-aware-scroll-view

## 6. Alternative Libraries

### react-native-keyboard-aware-scroll-view
May provide better programmatic control over keyboard behavior:
```javascript
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Potentially more responsive to programmatic focus
```

## 7. Conclusion

### Current State
- ✅ TextInput ref methods exist: `focus()`, `blur()`, `clear()`, `isFocused()`
- ❌ Ref methods don't trigger event handlers or KeyboardAvoidingView
- ✅ RNTL provides complete event simulation for testing
- ❌ No built-in event dispatching API in production React Native

### Recommendations

**For Testing:**
Use React Native Testing Library's `fireEvent` or `userEvent.setup()` - they provide complete event simulation.

**For Production:**
Currently no clean solution exists. Consider:
1. Architectural changes to avoid programmatic focus needs
2. Manual event handler invocation (hacky)
3. Alternative keyboard handling libraries
4. Custom native module for event dispatching (advanced)

### Future Possibilities
React Native may add:
- `dispatchEvent` API similar to web
- Event simulation utilities
- Better programmatic control over native behaviors

**Key Insight**: The gap exists because React Native prioritizes native platform behavior over programmatic control, which is generally good for UX but creates limitations for certain programmatic use cases.