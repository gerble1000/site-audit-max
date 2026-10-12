import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Screen, Title, Muted } from '@/src/components/ui';
import { useAppStore } from '@/src/store/useAppStore';
import * as repo from '@/src/db/repository';
import { getCaptureLocation, persistPickedUri } from '@/src/services/media';
import { playSfx } from '@/src/services/sfx';
import { playVoice } from '@/src/services/voiceClips';
import { spacing } from '@/src/theme/tokens';

export default function QuickCaptureScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useAppStore((s) => s.settings);
  const bumpData = useAppStore((s) => s.bumpData);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [savedUri, setSavedUri] = useState<string | null>(null);
  const [lastIssueId, setLastIssueId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  if (!permission) {
    return (
      <Screen>
        <Muted style={{ padding: 24 }}>Checking camera…</Muted>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View style={{ padding: spacing.lg, gap: 12 }}>
          <Title>Camera access</Title>
          <Muted>Quick Snag needs the camera to walk-and-shoot issues on site.</Muted>
          <Button label="Allow camera" onPress={() => void requestPermission()} />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const shoot = async () => {
    if (!projectId || !settings || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        Alert.alert('Capture failed', 'No photo returned from camera.');
        return;
      }

      // Show the shot immediately — don't wait on GPS / disk / DB.
      setPreviewUri(photo.uri);
      setSavedUri(null);
      setLastIssueId(null);
      setCount((n) => n + 1);
      setSaving(true);
      playSfx('capture');
      void playVoice('snag_captured');

      const loc = await getCaptureLocation();
      const uri = await persistPickedUri(projectId, photo.uri, settings.imageQuality);
      const counts = await repo.getIssueCounts(projectId);
      const issue = await repo.createIssue(projectId, {
        title: `Snag ${counts.total + 1}`,
      });
      await repo.addImage(issue.id, {
        uri,
        lat: loc.lat,
        lon: loc.lon,
        capturedAt: Date.now(),
      });
      setSavedUri(uri);
      setPreviewUri(uri);
      setLastIssueId(issue.id);
      bumpData();
    } catch (e) {
      playSfx('error');
      setPreviewUri(null);
      Alert.alert('Capture failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
      setSaving(false);
    }
  };

  const openAnnotate = async () => {
    if (!lastIssueId) return;
    const imgs = await repo.listImages(lastIssueId);
    if (imgs[0]) router.push(`/annotate/${imgs[0].id}`);
  };

  const displayUri = savedUri || previewUri;

  return (
    <Screen style={{ backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View
        pointerEvents="box-none"
        style={[
          styles.overlay,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.top}>
          <Button label="Done" variant="secondary" onPress={() => router.back()} />
          <Title style={{ color: '#fff' }}>Quick Snag · {count}</Title>
          <View style={{ width: 88 }} />
        </View>

        <View style={styles.bottom}>
          {displayUri ? (
            <View style={styles.thumbRow}>
              <Image source={{ uri: displayUri }} style={styles.thumb} />
              <Muted style={{ color: '#eee', flex: 1 }}>
                {saving ? 'Saving snag…' : 'Last snag saved — Capture again or review below'}
              </Muted>
            </View>
          ) : (
            <Muted style={{ color: '#ddd', textAlign: 'center', marginBottom: 8 }}>
              Tap Capture for each snag — photo appears right away
            </Muted>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture"
            disabled={busy}
            onPress={() => void shoot()}
            style={({ pressed }) => [
              styles.shutter,
              { opacity: busy || pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={styles.shutterText} numberOfLines={1}>
              {busy ? '…' : 'Capture'}
            </Text>
          </Pressable>
        </View>
      </View>

      {previewUri ? (
        <View style={[styles.reviewRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
          <Title style={{ color: '#fff', textAlign: 'center' }}>Snag {count} captured</Title>
          <Muted style={{ color: '#bbb', textAlign: 'center', marginBottom: 12 }}>
            {saving ? 'Saving to project…' : 'Review the photo, then keep shooting or annotate.'}
          </Muted>
          <Image
            source={{ uri: displayUri! }}
            style={styles.reviewImage}
            resizeMode="contain"
            accessibilityLabel={`Captured snag ${count}`}
          />
          {saving ? (
            <ActivityIndicator color="#2F6B3A" style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.reviewActions}>
              <Pressable
                style={styles.reviewBtn}
                onPress={() => {
                  setPreviewUri(null);
                  setSavedUri(null);
                }}
              >
                <Text style={styles.reviewBtnText} numberOfLines={1}>
                  Next snag
                </Text>
              </Pressable>
              <Pressable
                style={[styles.reviewBtn, styles.reviewBtnSecondary]}
                disabled={!lastIssueId}
                onPress={() => void openAnnotate()}
              >
                <Text style={[styles.reviewBtnText, { color: '#111' }]} numberOfLines={1}>
                  Annotate
                </Text>
              </Pressable>
            </View>
          )}
          <Pressable onPress={() => router.back()} style={{ paddingVertical: 14 }}>
            <Text style={{ color: '#ccc', textAlign: 'center', fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottom: { gap: 12, alignItems: 'center' },
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 10,
    borderRadius: 12,
  },
  thumb: { width: 64, height: 64, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  shutter: {
    minWidth: 200,
    paddingHorizontal: 36,
    minHeight: 64,
    borderRadius: 32,
    backgroundColor: '#2F6B3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  reviewRoot: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
    paddingHorizontal: 16,
    gap: 10,
  },
  reviewImage: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#111',
  },
  reviewActions: { flexDirection: 'row', gap: 10 },
  reviewBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#2F6B3A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  reviewBtnSecondary: {
    backgroundColor: '#E8EEF2',
  },
  reviewBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
