// The legacy entry point, matching src/db/repository.ts: the SDK 57 default entry
// exposes only the new File/Directory classes, which cannot read a file the
// workflow wrote into the app container from the host.
import * as FileSystem from 'expo-file-system/legacy';
import { router, type Href } from 'expo-router';

import { useAppStore } from '@/src/store/useAppStore';
import { existingPreviewTargets, seedPreviewData, type PreviewTargets } from './seedPreview';

/**
 * Development-only hook that lets the `iOS Simulator Preview` workflow choose
 * which screen the app opens on.
 *
 * The workflow writes `preview-target.json` into the app's Documents directory
 * before each launch, so the app opens straight onto the screen being
 * photographed. A launch argument or a deep link would be the obvious choices,
 * but neither survives the app's own startup: the root layout redirects to
 * onboarding while its settings load, which swallowed the deep link and left
 * every capture showing the welcome screen. A file read once the store is ready
 * has no such race, because the redirect is already satisfied by then.
 *
 * This never runs in a release build: applyPreviewTarget() returns immediately
 * unless __DEV__, and without the file it does nothing at all.
 */

const TARGET_FILE = 'preview-target.json';

const SCREENS = ['home', 'project', 'issue', 'report', 'folders', 'settings', 'more', 'quick-capture'] as const;
export type PreviewScreen = (typeof SCREENS)[number];

const EMPTY_TARGETS: PreviewTargets = { projectId: '', issueId: '', closedProjectId: '' };

export function resolveHref(screen: PreviewScreen, targets: PreviewTargets): Href {
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

export async function applyPreviewTarget(): Promise<string> {
  if (!__DEV__) return 'disabled';

  const file = `${FileSystem.documentDirectory}${TARGET_FILE}`;
  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(file);
  } catch {
    return 'no target';
  }

  // One launch, one instruction: a plain launch afterwards behaves normally.
  try {
    await FileSystem.deleteAsync(file, { idempotent: true });
  } catch {
    /* not fatal */
  }

  let requested: { screen?: string; seed?: boolean } = {};
  try {
    requested = JSON.parse(raw);
  } catch (e) {
    console.error('[preview] unreadable preview-target.json:', e);
    return 'bad target';
  }

  const screen: PreviewScreen = (SCREENS as readonly string[]).includes(requested.screen ?? '')
    ? (requested.screen as PreviewScreen)
    : 'home';

  try {
    let targets = await existingPreviewTargets();
    if (requested.seed || !targets) {
      console.log('[preview] seeding demo data');
      targets = await seedPreviewData();
      await useAppStore.getState().reinitAfterRestore();
    }
    if (!targets) targets = EMPTY_TARGETS;

    const href = resolveHref(screen, targets);
    console.log(`[preview] opening ${screen} -> ${href}`);
    router.replace(href);
    return screen;
  } catch (e) {
    console.error('[preview] could not open the requested screen:', e);
    return 'failed';
  }
}
