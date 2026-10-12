import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Button, Screen, Title, Muted } from '@/src/components/ui';
import { useAppStore } from '@/src/store/useAppStore';
import { palette, spacing } from '@/src/theme/tokens';
import { playSfx } from '@/src/services/sfx';
import { playVoice } from '@/src/services/voiceClips';

export default function OnboardingScreen() {
  const router = useRouter();
  const patchSettings = useAppStore((s) => s.patchSettings);

  useEffect(() => {
    void playVoice('welcome');
  }, []);

  const finish = async () => {
    await patchSettings({ onboardingDone: 1 });
    playSfx('complete');
    router.replace('/');
  };

  return (
    <Screen style={{ backgroundColor: palette.steel }}>
      <View style={styles.wrap}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <Text style={styles.brand}>Site Audit Max</Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(200).duration(600)}>
          <Title style={{ color: '#fff', fontSize: 28, marginTop: 12, fontFamily: 'System' }}>
            Snag. Annotate. Share.
          </Title>
          <Muted style={{ color: '#C5D0DB', marginTop: 12, fontSize: 16 }}>
            Capture site issues with photos, mark them up, and export branded PDF reports — fully
            offline. Save to your own Drive, Dropbox, or Files when you share.
          </Muted>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(400)} style={{ marginTop: 32, gap: 12 }}>
          <Bullet text="Projects with optional area & plot number" />
          <Bullet text="Annotation tools built for site photos" />
          <Bullet text="Eight report themes + CSV / ZIP export" />
          <Bullet text="Help covers offline projects, details, annotate, signatures & themes" />
        </Animated.View>
        <View style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <Button
            label="Start auditing"
            onPress={finish}
            style={{ backgroundColor: palette.brandGreen }}
          />
        </View>
      </View>
    </Screen>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Text style={{ color: palette.brandGreenBright, fontWeight: '700' }}>▸</Text>
      <Text style={{ color: '#E8EEF2', flex: 1, lineHeight: 22 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, paddingTop: 80, width: '100%', maxWidth: 640, alignSelf: 'center' },
  brand: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    color: palette.brandGreenBright,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
