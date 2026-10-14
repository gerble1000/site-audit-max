import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { listIssues, listProjects } from '@/src/db/repository';
import { seedPreviewData, type PreviewTargets } from '@/src/preview/seedPreview';
import { useAppStore } from '@/src/store/useAppStore';

/**
 * Development-only screen used by the `iOS Simulator Preview` workflow.
 *
 * The workflow opens `siteauditmax://preview?seed=1&screen=<name>` on a booted
 * simulator, which seeds demo data and then replaces the route with the screen
 * being photographed. It exists so screenshots can be captured without a human
 * tapping through the app, and it does nothing in a release build.
 */

const SCREENS = ['home', 'project', 'issue', 'report', 'folders', 'settings', 'more', 'quick-capture'] as const;
type Screen = (typeof SCREENS)[number];

const EMPTY_TARGETS: PreviewTargets = { projectId: '', issueId: '', closedProjectId: '' };

function hrefFor(screen: Screen, targets: PreviewTargets): Href {
  switch (screen) {
    case 'project':
      return `/project/${targets.projectId}` as Href;
    case 'issue':
      return `/issue/${targets.issueId}` as Href;
    case 'report':
      return `/report/${targets.projectId}` as Href;
    case 'quick-capture':
      return `/quick-capture/${targets.projectId}` as Href;
    case 'folders':
      return '/folders' as Href;
    case 'settings':
      return '/settings' as Href;
    case 'more':
      return '/more' as Href;
    default:
      return '/' as Href;
  }
}

/** Resolve targets from whatever is already in the database. */
async function existingTargets(): Promise<PreviewTargets> {
  const projects = await listProjects();
  const project = projects.find((p) => p.reference.startsWith('PREVIEW-')) ?? projects[0];
  if (!project) return EMPTY_TARGETS;
  const issues = await listIssues(project.id);
  return { projectId: project.id, issueId: issues[0]?.id ?? '', closedProjectId: project.id };
}

export default function PreviewRoute() {
  const params = useLocalSearchParams<{ screen?: string; seed?: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const screenParam = typeof params.screen === 'string' ? params.screen : 'home';
  const screen: Screen = (SCREENS as readonly string[]).includes(screenParam) ? (screenParam as Screen) : 'home';
  const shouldSeed = params.seed !== '0';

  useEffect(() => {
    if (!__DEV__) return;
    let cancelled = false;

    void (async () => {
      try {
        const targets = shouldSeed ? await seedPreviewData() : await existingTargets();
        if (shouldSeed) await useAppStore.getState().reinitAfterRestore();
        if (cancelled) return;
        router.replace(hrefFor(screen, targets));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [screen, shouldSeed, router]);

  if (!__DEV__) {
    return (
      <View style={styles.root}>
        <Text style={styles.label}>Preview mode is only available in development builds.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ActivityIndicator color="#2F6B3A" size="large" />
      <Text style={styles.label}>
        {error ? `Preview seeding failed: ${error}` : shouldSeed ? 'Seeding preview data…' : 'Opening preview…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F0', gap: 12, padding: 24 },
  label: { color: '#2F6B3A', fontSize: 14, textAlign: 'center' },
});
