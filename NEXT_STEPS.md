# Next Steps - Phase 4+ Mobile App Development

## ✅ Recently Completed
- Context menu (rename & delete) for chat sessions with Paper Menu + long-press
- PUT /api/chats/:id endpoint for renaming chats (Redis + memory fallback)
- Full API integration for rename/delete with graceful error handling
- Keyboard-aware rename dialog with Paper Dialog + TextInput + KeyboardAvoidingView

## 🔧 Technical Debt & Improvements

### Shared Components Migration (HIGH PRIORITY)
**Issue**: `@obsidian-bridge/shared-components` dependency causes caching issues and deployment complexity.

**Solution**: Inline all shared components directly into the mobile app:

```
ObsidianShare/
├── hooks/
│   ├── use-sessions-local.ts ✅ (done)
│   └── use-chat.ts (TODO)
├── components/
│   ├── SessionsProvider.tsx ✅ (done)
│   └── [other shared components] (TODO)
└── types/
    └── shared-types.ts (TODO)
```

**Benefits**:
- No more Metro cache issues with file: dependencies
- Faster development iterations (no rebuild needed)
- Simpler deployment (one less package to manage)
- TypeScript compilation issues resolved

**TODO**:
1. Move `use-chat` hook from shared-components to mobile app
2. Copy any other shared utilities/types that are used
3. Remove `@obsidian-bridge/shared-components` dependency entirely
4. Update web-prototype to use its own local copies if needed

### UI/UX Polish
- [ ] Implement proper rename TextInput with validation
- [ ] Add confirmation haptics for delete actions
- [ ] Improve long-press visual feedback
- [ ] Add swipe-to-delete gesture as alternative to long-press menu

### Performance Optimizations
- [ ] Lazy load chat messages (virtualization for large conversations)
- [ ] Implement proper loading states for API operations
- [ ] Add retry logic for failed network requests
- [ ] Cache session list locally with AsyncStorage

### Feature Completions
- [ ] Share intent integration (Android SEND actions)
- [ ] Offline mode with sync when online
- [ ] Chat export functionality
- [ ] Search within conversations

## Phase 4.8: Share Intent (Android)
- Android manifest configuration for SEND intents
- Handle shared URLs and text content
- Deep linking to create new chats with shared content

## Phase 5: iOS Support & App Store
- iOS share extension
- iOS-specific UI adjustments
- App Store compliance and submission

---

**Priority**: Fix shared components first, then continue with share intent integration.