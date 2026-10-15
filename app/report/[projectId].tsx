import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Switch, Text, View, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, contentWidth, Muted, Screen, Title } from '@/src/components/ui';
import { ReportPreview } from '@/src/components/ReportPreview';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useAppStore } from '@/src/store/useAppStore';
import { playSfx } from '@/src/services/sfx';
import { playVoice } from '@/src/services/voiceClips';
import {
  buildEmbeddedHtml,
  generateCsvFile,
  generatePdf,
  generateZipBundle,
  loadProjectReportData,
  shareFile,
} from '@/src/services/export';
import { REPORT_THEMES } from '@/src/services/reportBuilder';
import type { ReportThemeId } from '@/src/types';
import * as repo from '@/src/db/repository';
import { spacing } from '@/src/theme/tokens';

export default function ReportScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const c = useAppTheme();
  const settings = useAppStore((s) => s.settings);
  const wording = useAppStore((s) => s.wording);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [themeId, setThemeId] = useState<ReportThemeId>('steel');
  const [lastUri, setLastUri] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'location' | 'trade' | 'priority'>('none');
  const [includeQr, setIncludeQr] = useState(true);
  const [includeAppPromo, setIncludeAppPromo] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (settings?.defaultThemeId) setThemeId(settings.defaultThemeId as ReportThemeId);
  }, [settings?.defaultThemeId]);

  useEffect(() => {
    void (async () => {
      if (!projectId) return;
      const p = await repo.getProject(projectId);
      setLastUri(p?.latestReportUri ?? null);
      const data = await loadProjectReportData(projectId);
      setSummary(
        `${data.issues.length} ${wording.issuePlural.toLowerCase()} · ${
          data.issues.filter((i) => !i.completed && i.status !== 'closed').length
        } open`
      );
    })();
  }, [projectId, wording]);

  if (!settings) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  const toggle = (key: keyof typeof settings, value: boolean) =>
    void patchSettings({ [key]: value ? 1 : 0 } as never);

  const payloadBase = async () => {
    if (!projectId) throw new Error('Missing project');
    const data = await loadProjectReportData(projectId);
    return {
      ...data,
      themeId,
      accentOverride: settings.customAccent,
      openOnly,
      groupBy,
      includeQr,
      includeAppPromo,
    };
  };

  const preview = async () => {
    setBusy(true);
    setProgress('Building preview…');
    try {
      const payload = await payloadBase();
      const html = await buildEmbeddedHtml(payload, (done, total) =>
        setProgress(`Embedding photo ${done}/${total}…`)
      );
      setPreviewHtml(html);
      setPreviewOpen(true);
    } catch (e) {
      playSfx('error');
      Alert.alert('Preview failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const run = async (kind: 'pdf' | 'csv' | 'zip') => {
    setBusy(true);
    try {
      const payload = await payloadBase();
      let uri = '';
      if (kind === 'pdf') {
        uri = await generatePdf(payload, (done, total) =>
          setProgress(`Embedding photo ${done}/${total}…`)
        );
      }
      if (kind === 'csv') uri = await generateCsvFile(payload);
      if (kind === 'zip') {
        uri = await generateZipBundle(payload, (done, total) =>
          setProgress(`Embedding photo ${done}/${total}…`)
        );
      }
      setLastUri(uri);
      await shareFile(uri);
      playSfx('share');
      void playVoice('report_ready');
      await patchSettings({ defaultThemeId: themeId });
    } catch (e) {
      playSfx('error');
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <Screen>
      <ScrollView style={contentWidth} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <Card>
          <Title>Export report</Title>
          <Muted style={{ marginTop: 6 }}>{summary}</Muted>
          {progress ? <Muted style={{ marginTop: 8, color: c.accent }}>{progress}</Muted> : null}
        </Card>

        <Title style={{ marginBottom: 8 }}>Theme</Title>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {REPORT_THEMES.map((t) => (
            <Chip
              key={t.id}
              label={t.name}
              color={t.accent}
              active={themeId === t.id}
              onPress={() => setThemeId(t.id)}
            />
          ))}
        </View>

        <Card>
          <Title>Options</Title>
          <Opt label="Open issues only" value={openOnly} onChange={setOpenOnly} />
          {/* Android-only: the promo advertises our Play Store listing, which App Review
              Guideline 2.3.10 does not allow inside the iOS app. */}
          {Platform.OS === 'android' ? (
            <Opt label="App promo + Play Store QR" value={includeAppPromo} onChange={setIncludeAppPromo} />
          ) : null}
          <Opt label="Reference strip (decorative)" value={includeQr} onChange={setIncludeQr} />
          <Opt label="Timestamps on photos" value={!!settings.reportShowTimestamps} onChange={(v) => toggle('reportShowTimestamps', v)} />
          <Opt label="GPS on photos" value={!!settings.reportShowGps} onChange={(v) => toggle('reportShowGps', v)} />
          <Opt label="Page numbers" value={!!settings.reportShowPageNumbers} onChange={(v) => toggle('reportShowPageNumbers', v)} />
          <Opt label="Show introduction" value={!!settings.reportShowIntro} onChange={(v) => toggle('reportShowIntro', v)} />
          <Opt label="Show summary" value={!!settings.reportShowSummary} onChange={(v) => toggle('reportShowSummary', v)} />
          <Opt label="Show issue counts" value={!!settings.reportShowCounts} onChange={(v) => toggle('reportShowCounts', v)} />
          <Muted style={{ marginTop: 12 }}>Group by</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {(['none', 'location', 'trade', 'priority'] as const).map((g) => (
              <Chip key={g} label={g} active={groupBy === g} onPress={() => setGroupBy(g)} />
            ))}
          </View>
        </Card>

        <View style={{ gap: 10, marginTop: 8 }}>
          <Button label={busy ? 'Working…' : 'Preview'} disabled={busy} variant="secondary" onPress={() => void preview()} />
          <Button label="Share PDF" disabled={busy} onPress={() => void run('pdf')} />
          <Button label="Share CSV" variant="secondary" disabled={busy} onPress={() => void run('csv')} />
          <Button label="Share ZIP" variant="secondary" disabled={busy} onPress={() => void run('zip')} />
          {lastUri?.endsWith('.pdf') ? (
            <Button label="Share latest PDF again" variant="ghost" onPress={() => void shareFile(lastUri)} />
          ) : null}
        </View>
      </ScrollView>
      <ReportPreview visible={previewOpen} html={previewHtml} onClose={() => setPreviewOpen(false)} />
    </Screen>
  );
}

function Opt({
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, minHeight: 44 }}>
      <Text style={{ color: c.text, flex: 1, paddingRight: 12 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
