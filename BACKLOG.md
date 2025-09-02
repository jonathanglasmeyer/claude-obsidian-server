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
<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" class="icon-lg text-token-text-secondary mx-2"><path d="M11.6663 12.6686L11.801 12.6823C12.1038 12.7445 12.3313 13.0125 12.3313 13.3337C12.3311 13.6547 12.1038 13.9229 11.801 13.985L11.6663 13.9987H3.33325C2.96609 13.9987 2.66839 13.7008 2.66821 13.3337C2.66821 12.9664 2.96598 12.6686 3.33325 12.6686H11.6663ZM16.6663 6.00163L16.801 6.0153C17.1038 6.07747 17.3313 6.34546 17.3313 6.66667C17.3313 6.98788 17.1038 7.25586 16.801 7.31803L16.6663 7.33171H3.33325C2.96598 7.33171 2.66821 7.03394 2.66821 6.66667C2.66821 6.2994 2.96598 6.00163 3.33325 6.00163H16.6663Z"></path></svg>
