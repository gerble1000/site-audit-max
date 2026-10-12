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
  ScrollView,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { radii, spacing } from '../../theme/tokens';

export type CreateProjectValues = {
  title: string;
  area: string;
  plotNumber: string;
};

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (values: CreateProjectValues) => void;
};

export function CreateProjectModal({ visible, onCancel, onConfirm }: Props) {
  const c = useAppTheme();
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [plotNumber, setPlotNumber] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setArea('');
      setPlotNumber('');
    }
  }, [visible]);

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    autoFocus?: boolean
  ) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: c.textMuted, marginBottom: 4, fontWeight: '600' }}>{label}</Text>
      <TextInput
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        style={[
          styles.input,
          {
            color: c.text,
            borderColor: c.border,
            backgroundColor: c.surfaceElevated,
          },
        ]}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: c.text }]}>New project</Text>
            <Text style={{ color: c.textMuted, marginBottom: 14, lineHeight: 20 }}>
              Name the job, then add area and plot if you need them.
            </Text>
            {field('Project name', title, setTitle, 'e.g. Riverside Phase 2', true)}
            {field('Area (optional)', area, setArea, 'e.g. Block A')}
            {field('Plot number (optional)', plotNumber, setPlotNumber, 'e.g. Plot 14')}
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
                onPress={() =>
                  onConfirm({
                    title: title.trim(),
                    area: area.trim(),
                    plotNumber: plotNumber.trim(),
                  })
                }
                style={[styles.btn, { backgroundColor: c.accent, borderColor: c.accent }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '90%',
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
    minHeight: 48,
  },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
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
