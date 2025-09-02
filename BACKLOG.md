# Drawer Navigation Refactoring - Inkrementelle Schritte

## Phase 1: Core Navigation Setup
- [x] **Packages installieren**: `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/drawer`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-paper`
- [x] **Theme Setup**: MD3-Theme (Paper) mit `adaptNavigationTheme`; `PaperProvider` um `NavigationContainer`
- [x] **Basic Architecture**: DrawerNavigator als Root mit NativeStack (StartNew + Chat routen)

## Phase 2: Drawer Content & Behavior
- [x] **Custom Drawer Content**: `drawerContent` mit Paper-Liste (keine extra App-Bar)
- [x] **Phone Setup**: `drawerType: 'front'`, `swipeEdgeWidth: 24-32`
- [x] **Navigation Logic**: Tap → `navigation.navigate('Chat', {id})`

## Phase 2.5: ChatGPT-style Gestures ✅
- [x] **Content Drag Gesture**: Swipe right auf main chat content öffnet drawer (nicht nur edge swipe)
- [x] **Natural Slide Motion**: Standard drawer slide animation (vermutlich schon default)
- [x] **Progressive Drawer**: Custom implementation with finger-following drag reveal
- [x] **Real-time Animation**: `react-native-reanimated` + `react-native-gesture-handler` integration
- [x] **ChatGPT-style UX**: Drawer follows finger position, snaps to open/close on release

### Technical Implementation
**ProgressiveDrawer Component** (`components/ProgressiveDrawer.tsx`):
- **Finger-following**: Real-time drawer position tracking with `PanGestureHandler`
- **Progressive reveal**: Drawer slides out smoothly as you drag right (0-100% progress)
- **Smart thresholds**: Opens if >50% dragged OR fast swipe (>500px/s velocity)
- **Parallax effects**: Main content scales down (95%) + translates right (20%) during reveal
- **Overlay dimming**: Progressive darkness overlay (0-30% opacity)
- **Edge detection**: Responds to drags from left edge (50px) OR when drawer already open

**Architecture Changes**:
- Replaced `@react-navigation/drawer` with custom implementation
- **DrawerContext** for communication between components
- **CustomDrawerContent** updated to work without navigation props
- **ChatScreen** uses `useDrawerContext()` instead of `navigation.openDrawer()`

**Key Features**:
- ✅ **Smooth finger tracking** - drawer position matches drag progress
- ✅ **Velocity-based snapping** - respects swipe momentum
- ✅ **Visual feedback** - parallax + dimming effects like ChatGPT
- ✅ **Edge + content dragging** - works from screen edge AND anywhere on content
- ✅ **Performance optimized** - native animations with reanimated

**better icon**
