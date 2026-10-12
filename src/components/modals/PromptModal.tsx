import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { radii, spacing } from '../../theme/tokens';

type PromptModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  multiline?: boolean;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

export function PromptModal({
  visible,
  title,
  message,
  placeholder,
  initialValue = '',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  multiline,
  onCancel,
  onConfirm,
}: PromptModalProps) {
  const c = useAppTheme();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          {message ? <Text style={{ color: c.textMuted, marginBottom: 12 }}>{message}</Text> : null}
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={c.textMuted}
            multiline={multiline}
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: c.border,
                backgroundColor: c.surfaceElevated,
                minHeight: multiline ? 90 : 48,
              },
            ]}
          />
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={[styles.btn, { borderColor: c.border }]}
            >
              <Text style={{ color: c.text, fontWeight: '600' }}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onConfirm(value)}
              style={[styles.btn, { backgroundColor: c.accent, borderColor: c.accent }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const c = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          {message ? <Text style={{ color: c.textMuted, marginBottom: 16 }}>{message}</Text> : null}
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={[styles.btn, { borderColor: c.border }]}
            >
              <Text style={{ color: c.text, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={[
                styles.btn,
                {
                  backgroundColor: destructive ? c.danger : c.accent,
                  borderColor: destructive ? c.danger : c.accent,
                },
              ]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  btn: {
    minHeight: 48,
    minWidth: 96,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
