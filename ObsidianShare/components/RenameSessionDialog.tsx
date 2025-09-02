import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Dialog, Portal, TextInput, Button } from 'react-native-paper';

interface RenameSessionDialogProps {
  visible: boolean;
  currentTitle: string;
  onDismiss: () => void;
  onConfirm: (newTitle: string) => void;
}

export function RenameSessionDialog({
  visible,
  currentTitle,
  onDismiss,
  onConfirm
}: RenameSessionDialogProps) {
  const [title, setTitle] = useState(currentTitle);

  // Update title when dialog opens with new currentTitle
  useEffect(() => {
    if (visible) {
      setTitle(currentTitle);
    }
  }, [visible, currentTitle]);

  const handleConfirm = () => {
    if (title.trim()) {
      onConfirm(title.trim());
      onDismiss();
    }
  };

  const handleCancel = () => {
    setTitle(currentTitle); // Reset to original
    onDismiss();
  };

  return (
    <Portal>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Dialog visible={visible} onDismiss={handleCancel}>
          <Dialog.Title>Rename Chat</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView 
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                label="Chat Name"
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                autoFocus
                selectTextOnFocus
                onSubmitEditing={handleConfirm}
                style={{ marginBottom: 8 }}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={handleCancel}>Cancel</Button>
            <Button 
              onPress={handleConfirm}
              disabled={!title.trim()}
            >
              Rename
            </Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  );
}