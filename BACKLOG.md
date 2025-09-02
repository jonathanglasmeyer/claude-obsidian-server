# Drawer Navigation Refactoring - Inkrementelle Schritte

## Phase 1: Core Navigation Setup
- [x] **Packages installieren**: `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/drawer`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-paper`
- [x] **Theme Setup**: MD3-Theme (Paper) mit `adaptNavigationTheme`; `PaperProvider` um `NavigationContainer`
- [x] **Basic Architecture**: DrawerNavigator als Root mit NativeStack (StartNew + Chat routen)

## Phase 2: Drawer Content & Behavior
- [x] **Custom Drawer Content**: `drawerContent` mit Paper-Liste (keine extra App-Bar)
- [x] **Phone Setup**: `drawerType: 'front'`, `swipeEdgeWidth: 24-32`
- [x] **Navigation Logic**: Tap → `navigation.navigate('Chat', {id})`

## Phase 2.5: ChatGPT-style Gestures
- [ ] **Content Drag Gesture**: Swipe right auf main chat content öffnet drawer (nicht nur edge swipe)
- [x] **Natural Slide Motion**: Standard drawer slide animation (vermutlich schon default)
