import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Button, Card, contentWidth, Muted, Screen, SectionLabel, Title } from '@/src/components/ui';
import { SignaturePad } from '@/src/components/SignaturePad';
import { useAppStore } from '@/src/store/useAppStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { pickBrandingAsset } from '@/src/services/media';
import { DEFAULT_WORDING, type AppSettings, type WordingConfig } from '@/src/types';
import { spacing } from '@/src/theme/tokens';
import { playSfx } from '@/src/services/sfx';
import { playVoice } from '@/src/services/voiceClips';

const TEXT_DEBOUNCE_MS = 450;

export default function SettingsScreen() {
  const c = useAppTheme();
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const wording = useAppStore((s) => s.wording);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const reinitAfterRestore = useAppStore((s) => s.reinitAfterRestore);
  const [showSig, setShowSig] = useState(false);
  const [localWording, setLocalWording] = useState<WordingConfig>(wording);
  const [companyName, setCompanyName] = useState(settings?.companyName ?? '');
  const [auditorName, setAuditorName] = useState(settings?.auditorName ?? '');
  const [accentDraft, setAccentDraft] = useState(settings?.customAccent ?? '');
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!settings) return;
    setCompanyName(settings.companyName);
    setAuditorName(settings.auditorName);
    setAccentDraft(settings.customAccent);
    setLocalWording(wording);
  }, [settings, wording]);

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  if (!settings) return null;

  const debouncePatch = (key: string, patch: Partial<AppSettings>) => {
    const existing = debounceTimers.current[key];
    if (existing) clearTimeout(existing);
    debounceTimers.current[key] = setTimeout(() => {
      void patchSettings(patch);
    }, TEXT_DEBOUNCE_MS);
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    onDebounced?: (v: string) => void
  ) => (
    <View style={{ marginBottom: 12 }}>
      <Muted>{label}</Muted>
      <TextInput
        value={value}
        onChangeText={(v) => {
          onChange(v);
          onDebounced?.(v);
        }}
        style={{
          marginTop: 4,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surfaceElevated,
          color: c.text,
          borderRadius: 10,
          padding: 12,
          minHeight: 48,
        }}
      />
    </View>
  );

  return (
    <Screen>
      <ScrollView style={contentWidth} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
        <SectionLabel>BRANDING</SectionLabel>
        <Card>
          <Title>Company branding</Title>
          {field(
            'Company name',
            companyName,
            setCompanyName,
            (v) => debouncePatch('companyName', { companyName: v })
          )}
          {field(
            'Auditor name',
            auditorName,
            setAuditorName,
            (v) => debouncePatch('auditorName', { auditorName: v })
          )}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              label="Pick logo"
              variant="secondary"
              onPress={async () => {
                const uri = await pickBrandingAsset('logo');
                if (uri) await patchSettings({ logoUri: uri });
              }}
            />
            <Button label="Draw signature" variant="secondary" onPress={() => setShowSig(true)} />
            <Button
              label="Clear signature"
              variant="ghost"
              onPress={() => void patchSettings({ signatureUri: null })}
            />
          </View>
          {showSig ? (
            <View style={{ marginTop: 12 }}>
              <SignaturePad
                onCancel={() => setShowSig(false)}
                onSaved={async (uri) => {
                  await patchSettings({ signatureUri: uri });
                  setShowSig(false);
                  playSfx('complete');
                }}
              />
            </View>
          ) : null}
        </Card>

        <Card>
          <Title>Industry wording</Title>
          {field('Issue singular', localWording.issueSingular, (v) =>
            setLocalWording((w) => ({ ...w, issueSingular: v }))
          )}
          {field('Issue plural', localWording.issuePlural, (v) =>
            setLocalWording((w) => ({ ...w, issuePlural: v }))
          )}
          {field('Identified phrase', localWording.identifiedPhrase, (v) =>
            setLocalWording((w) => ({ ...w, identifiedPhrase: v }))
          )}
          {field('Incomplete phrase', localWording.incompletePhrase, (v) =>
            setLocalWording((w) => ({ ...w, incompletePhrase: v }))
          )}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              label="Save wording"
              onPress={async () => {
                await patchSettings({ wordingJson: JSON.stringify(localWording) });
                playSfx('complete');
              }}
            />
            <Button
              label="Reset defaults"
              variant="secondary"
              onPress={async () => {
                setLocalWording(DEFAULT_WORDING);
                await patchSettings({ wordingJson: JSON.stringify(DEFAULT_WORDING) });
              }}
            />
          </View>
        </Card>

        <SectionLabel style={{ marginTop: 8 }}>REPORTS</SectionLabel>
        <Card>
          <Title>Default report theme</Title>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {(
              [
                ['steel', 'Steel'],
                ['blueprint', 'Blueprint'],
                ['site', 'Site Walk'],
                ['ledger', 'Ledger'],
                ['safety', 'Safety'],
                ['slate', 'Slate'],
                ['timber', 'Timber'],
                ['concrete', 'Concrete'],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                label={label}
                variant={settings.defaultThemeId === id ? 'primary' : 'secondary'}
                onPress={() => void patchSettings({ defaultThemeId: id })}
              />
            ))}
          </View>
          <Muted style={{ marginTop: 12 }}>Report accent</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {['#2F6B3A', '#2563EB', '#16A34A', '#B42318', '#7C3AED', '#0F766E', '#E85D04'].map((col) => (
              <Button
                key={col}
                label=" "
                onPress={() => {
                  setAccentDraft(col);
                  void patchSettings({ customAccent: col });
                }}
                style={{
                  backgroundColor: col,
                  width: 44,
                  height: 44,
                  paddingVertical: 0,
                  borderWidth: settings.customAccent === col ? 3 : 0,
                  borderColor: c.text,
                }}
              />
            ))}
          </View>
          <TextInput
            value={accentDraft}
            onChangeText={(v) => {
              setAccentDraft(v);
              debouncePatch('customAccent', { customAccent: v });
            }}
            autoCapitalize="none"
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: c.border,
              color: c.text,
              backgroundColor: c.surfaceElevated,
              borderRadius: 10,
              padding: 12,
              minHeight: 48,
            }}
          />
        </Card>

        <SectionLabel style={{ marginTop: 8 }}>APPEARANCE</SectionLabel>
        <Card>
          <Title>Appearance & media</Title>
          <Row
            label="Sound effects"
            value={!!settings.sfxEnabled}
            onChange={(v) => void patchSettings({ sfxEnabled: v ? 1 : 0 })}
          />
          <Row
            label="Haptics"
            value={!!settings.hapticsEnabled}
            onChange={(v) => void patchSettings({ hapticsEnabled: v ? 1 : 0 })}
          />
          <Row
            label="High contrast"
            value={!!settings.highContrast}
            onChange={(v) => void patchSettings({ highContrast: v ? 1 : 0 })}
          />
          <Row
            label="Use square images"
            value={!!settings.useSquareImages}
            onChange={(v) => void patchSettings({ useSquareImages: v ? 1 : 0 })}
          />
          <Row
            label="Hide completed projects"
            value={!!settings.hideCompletedProjects}
            onChange={(v) => void patchSettings({ hideCompletedProjects: v ? 1 : 0 })}
          />
          <Muted style={{ marginTop: 12 }}>Image quality</Muted>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {(
              [
                [60, 'Low'],
                [80, 'Med'],
                [95, 'High'],
              ] as const
            ).map(([q, label]) => (
              <Button
                key={q}
                label={label}
                variant={settings.imageQuality === q ? 'primary' : 'secondary'}
                onPress={() => void patchSettings({ imageQuality: q })}
              />
            ))}
          </View>
          <Muted style={{ marginTop: 8 }}>Theme</Muted>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <Button
                key={mode}
                label={mode}
                variant={settings.appearance === mode ? 'primary' : 'secondary'}
                onPress={() => void patchSettings({ appearance: mode })}
              />
            ))}
          </View>
          <Muted style={{ marginTop: 12 }}>Project sort</Muted>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {(
              [
                ['date_desc', 'Newest'],
                ['date_asc', 'Oldest'],
                ['title', 'Title'],
                ['reference', 'Reference'],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                label={label}
                variant={settings.projectSort === id ? 'primary' : 'secondary'}
                onPress={() => void patchSettings({ projectSort: id })}
              />
            ))}
          </View>
        </Card>

        <SectionLabel style={{ marginTop: 8 }}>BACKUP</SectionLabel>
        <Card>
          <Title>Backup</Title>
          <Muted>
            Full offline backup includes the database, media, and branding. Generated PDF reports in
            reports/ are not included — re-export after restore if needed. Backups may contain GPS
            coordinates from photos; store them privately.
          </Muted>
          <Button
            label="Export backup ZIP"
            variant="secondary"
            style={{ marginTop: 12 }}
            onPress={async () => {
              try {
                const { exportLocalBackup } = await import('@/src/services/backup');
                await exportLocalBackup();
                playSfx('share');
                void playVoice('backup_done');
              } catch (e) {
                playSfx('error');
                Alert.alert('Backup failed', e instanceof Error ? e.message : 'Unknown error');
              }
            }}
          />
          <Button
            label="Restore backup ZIP"
            variant="ghost"
            style={{ marginTop: 8 }}
            onPress={async () => {
              Alert.alert('Restore backup?', 'This replaces local data with the backup contents.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Restore',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { importLocalBackup } = await import('@/src/services/backup');
                      await importLocalBackup();
                      await reinitAfterRestore();
                      playSfx('complete');
                      Alert.alert('Restored', 'Your data has been reloaded from the backup.');
                    } catch (e) {
                      playSfx('error');
                      Alert.alert('Restore failed', e instanceof Error ? e.message : 'Unknown error');
                    }
                  },
                },
              ]);
            }}
          />
        </Card>

        <Card>
          <Title>About</Title>
          <Muted>
            Site Audit Max runs fully offline. Share PDF, CSV, or ZIP reports into your own Drive,
            Dropbox, Files, or email. No account required.
          </Muted>
          <Button
            label="Help & tips"
            variant="secondary"
            onPress={() => router.push('/help' as Href)}
            style={{ marginTop: 10 }}
          />
          <Button
            label="Replay onboarding"
            variant="ghost"
            onPress={() => void patchSettings({ onboardingDone: 0 })}
            style={{ marginTop: 8 }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, minHeight: 44 }}>
      <Text style={{ color: c.text }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
