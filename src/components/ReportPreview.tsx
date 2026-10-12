import React from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Button, Title } from './ui';
import { useAppTheme } from '../theme/ThemeProvider';

export function ReportPreview({
  visible,
  html,
  onClose,
}: {
  visible: boolean;
  html: string;
  onClose: () => void;
}) {
  const c = useAppTheme();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <Title>Report preview</Title>
          <Button label="Close" variant="secondary" onPress={onClose} />
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={{ flex: 1, minHeight: height - 100, backgroundColor: '#fff' }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
