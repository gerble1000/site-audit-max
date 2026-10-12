import { create } from 'zustand';
import type {
  AppSettings,
  Folder,
  Issue,
  IssueImage,
  Project,
  WordingConfig,
} from '../types';
import { DEFAULT_WORDING } from '../types';
import * as repo from '../db/repository';
import type { DashboardStats, ProjectStats } from '../db/repository';
import { migrateDatabase } from '../db/client';
import { setSfxEnabled, setHapticsEnabled } from '../services/sfx';

type FolderWithCount = Folder & { projectCount: number };

const EMPTY_DASHBOARD: DashboardStats = {
  projects: 0,
  openSnags: 0,
  closedToday: 0,
  criticalSnags: 0,
};

type AppState = {
  ready: boolean;
  settings: AppSettings | null;
  wording: WordingConfig;
  folders: FolderWithCount[];
  projects: Project[];
  projectStats: Record<string, ProjectStats>;
  dashboard: DashboardStats;
  search: string;
  selectedFolderId: string | null | undefined;
  /** Bumped when issues/images change so focused screens can refresh. */
  dataEpoch: number;
  init: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshFolders: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  setSearch: (q: string) => void;
  setSelectedFolderId: (id: string | null | undefined) => void;
  patchSettings: (patch: Partial<AppSettings>) => Promise<void>;
  bumpData: () => void;
  reinitAfterRestore: () => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  settings: null,
  wording: DEFAULT_WORDING,
  folders: [],
  projects: [],
  projectStats: {},
  dashboard: EMPTY_DASHBOARD,
  search: '',
  selectedFolderId: undefined,
  dataEpoch: 0,
  init: async () => {
    migrateDatabase();
    await get().refreshSettings();
    await get().refreshFolders();
    await get().refreshProjects();
    set({ ready: true });
  },
  /** Re-open DB + refresh all lists after a backup restore. */
  reinitAfterRestore: async () => {
    const { resetDatabaseConnection, migrateDatabase: migrate } = await import('../db/client');
    resetDatabaseConnection();
    migrate();
    await get().refreshSettings();
    await get().refreshFolders();
    await get().refreshProjects();
    set((s) => ({ dataEpoch: s.dataEpoch + 1, ready: true }));
  },
  refreshSettings: async () => {
    const settings = await repo.getSettings();
    setSfxEnabled(!!settings.sfxEnabled);
    setHapticsEnabled(!!settings.hapticsEnabled);
    set({
      settings,
      wording: repo.parseWording(settings.wordingJson),
    });
  },
  refreshFolders: async () => {
    const settings = get().settings;
    let folders = await repo.listFolders();
    if (settings?.folderSort === 'count') {
      folders = [...folders].sort((a, b) => b.projectCount - a.projectCount);
    } else {
      folders = [...folders].sort((a, b) => a.title.localeCompare(b.title));
    }
    set({ folders });
  },
  refreshProjects: async () => {
    const { settings, search, selectedFolderId } = get();
    const [projects, projectStats, dashboard] = await Promise.all([
      repo.listProjects({
        folderId: selectedFolderId,
        search,
        hideCompleted: !!settings?.hideCompletedProjects,
        sort: settings?.projectSort,
      }),
      repo.listProjectStats(),
      repo.getDashboardStats(),
    ]);
    set({ projects, projectStats, dashboard });
  },
  setSearch: (q) => {
    set({ search: q });
    void get().refreshProjects();
  },
  setSelectedFolderId: (id) => {
    set({ selectedFolderId: id });
    void get().refreshProjects();
  },
  patchSettings: async (patch) => {
    await repo.updateSettings(patch);
    await get().refreshSettings();
    await get().refreshProjects();
    await get().refreshFolders();
  },
  bumpData: () => set((s) => ({ dataEpoch: s.dataEpoch + 1 })),
}));

export async function loadIssueBundle(issueId: string): Promise<{
  issue: Issue | null;
  images: IssueImage[];
}> {
  const issue = await repo.getIssue(issueId);
  const images = issue ? await repo.listImages(issueId) : [];
  return { issue, images };
}
