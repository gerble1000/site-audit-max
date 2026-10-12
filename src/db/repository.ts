import { eq, asc, sql } from 'drizzle-orm';
import { getDb, getSqlite } from './client';
import {
  folders,
  projects,
  issues,
  images,
  settings,
  contacts,
  templates,
  templateItems,
  floorPlans,
  floorPlanPins,
} from './schema';
import { createId } from '../utils/id';
import type {
  AppSettings,
  Contact,
  FloorPlan,
  FloorPlanPin,
  Folder,
  ImageRole,
  Issue,
  IssueImage,
  IssuePriority,
  IssueStatus,
  Project,
  Template,
  TemplateItem,
  WordingConfig,
} from '../types';
import { DEFAULT_WORDING, FOLDER_COLORS } from '../types';
import * as FileSystem from 'expo-file-system/legacy';

function mapProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    folderId: row.folderId,
    title: row.title,
    reference: row.reference,
    client: row.client,
    address: row.address,
    area: row.area ?? '',
    plotNumber: row.plotNumber ?? '',
    coverUri: row.coverUri,
    intro: row.intro,
    summary: row.summary,
    notes: row.notes,
    pinned: row.pinned,
    completed: row.completed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    latestReportUri: row.latestReportUri,
    inspectionDate: row.inspectionDate ?? null,
    phase: row.phase ?? '',
    clientSignatureUri: row.clientSignatureUri ?? null,
    clientSignedAt: row.clientSignedAt ?? null,
    deletedAt: row.deletedAt ?? null,
  };
}

function mapIssue(row: typeof issues.$inferSelect): Issue {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    assignee: row.assignee,
    comments: row.comments,
    dueDate: row.dueDate,
    completed: row.completed,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    snagNumber: row.snagNumber ?? null,
    priority: (row.priority as IssuePriority | '') || '',
    status: (row.status as IssueStatus) || 'open',
    category: row.category ?? '',
    trade: row.trade ?? '',
    location: row.location ?? '',
    remedialNotes: row.remedialNotes ?? '',
    closedAt: row.closedAt ?? null,
    audioUri: row.audioUri ?? null,
    deletedAt: row.deletedAt ?? null,
  };
}

function mapImage(row: typeof images.$inferSelect): IssueImage {
  return {
    id: row.id,
    issueId: row.issueId,
    uri: row.uri,
    annotatedUri: row.annotatedUri,
    lat: row.lat,
    lon: row.lon,
    capturedAt: row.capturedAt,
    sortOrder: row.sortOrder,
    role: (row.role as ImageRole) || 'evidence',
    caption: row.caption ?? '',
    audioUri: row.audioUri ?? null,
  };
}

function mapFolder(row: typeof folders.$inferSelect): Folder {
  return {
    id: row.id,
    title: row.title,
    color: row.color,
    sortKey: row.sortKey,
    createdAt: row.createdAt,
  };
}

async function deleteFileSafe(uri: string | null | undefined) {
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}

export async function getSettings(): Promise<AppSettings> {
  const db = getDb();
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  const row = rows[0];
  if (!row) throw new Error('Settings row missing');
  return {
    id: row.id,
    companyName: row.companyName,
    logoUri: row.logoUri,
    auditorName: row.auditorName,
    signatureUri: row.signatureUri,
    wordingJson: row.wordingJson,
    appearance: row.appearance as AppSettings['appearance'],
    useSquareImages: row.useSquareImages,
    imageQuality: row.imageQuality,
    sfxEnabled: row.sfxEnabled,
    defaultThemeId: row.defaultThemeId,
    customAccent: row.customAccent,
    reportShowTimestamps: row.reportShowTimestamps,
    reportShowGps: row.reportShowGps,
    reportShowPageNumbers: row.reportShowPageNumbers,
    reportShowIntro: row.reportShowIntro,
    reportShowSummary: row.reportShowSummary,
    reportShowCounts: row.reportShowCounts,
    hideCompletedProjects: row.hideCompletedProjects,
    projectSort: row.projectSort as AppSettings['projectSort'],
    folderSort: row.folderSort as AppSettings['folderSort'],
    onboardingDone: row.onboardingDone,
    highContrast: row.highContrast ?? 0,
    hapticsEnabled: row.hapticsEnabled ?? 1,
  };
}

export async function updateSettings(patch: Partial<AppSettings>) {
  const db = getDb();
  const { id: _id, ...rest } = patch as Partial<AppSettings> & { id?: number };
  await db.update(settings).set(rest as any).where(eq(settings.id, 1));
}

export function parseWording(json: string): WordingConfig {
  try {
    return { ...DEFAULT_WORDING, ...JSON.parse(json) };
  } catch {
    return DEFAULT_WORDING;
  }
}

export async function listFolders(): Promise<(Folder & { projectCount: number })[]> {
  const db = getDb();
  const all = await db.select().from(folders).orderBy(asc(folders.sortKey), asc(folders.title));
  const counts = await db
    .select({
      folderId: projects.folderId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(projects)
    .groupBy(projects.folderId);
  const countMap = new Map(counts.map((c) => [c.folderId, c.count]));
  return all.map((f) => ({ ...mapFolder(f), projectCount: countMap.get(f.id) ?? 0 }));
}

export async function createFolder(title: string, color?: string): Promise<Folder> {
  const db = getDb();
  const id = createId('fld');
  const now = Date.now();
  const row = {
    id,
    title: title.trim() || 'Untitled folder',
    color: color || FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
    sortKey: now,
    createdAt: now,
  };
  await db.insert(folders).values(row);
  return mapFolder(row);
}

export async function updateFolder(id: string, patch: Partial<Pick<Folder, 'title' | 'color' | 'sortKey'>>) {
  const db = getDb();
  await db.update(folders).set(patch).where(eq(folders.id, id));
}

export async function deleteFolder(id: string) {
  const db = getDb();
  await db.update(projects).set({ folderId: null }).where(eq(projects.folderId, id));
  await db.delete(folders).where(eq(folders.id, id));
}

export async function listProjects(opts?: {
  folderId?: string | null;
  search?: string;
  hideCompleted?: boolean;
  sort?: AppSettings['projectSort'];
}): Promise<Project[]> {
  const db = getDb();
  let rows = await db.select().from(projects);
  // Soft-delete columns exist but are unused; hard-delete is the only path.

  if (opts?.folderId === null) rows = rows.filter((p) => !p.folderId);
  else if (opts?.folderId) rows = rows.filter((p) => p.folderId === opts.folderId);

  if (opts?.hideCompleted) rows = rows.filter((p) => !p.completed);

  if (opts?.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    rows = rows.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.area ?? '').toLowerCase().includes(q) ||
        (p.plotNumber ?? '').toLowerCase().includes(q)
    );
  }

  const sort = opts?.sort ?? 'date_desc';
  rows.sort((a, b) => {
    if (b.pinned !== a.pinned) return b.pinned - a.pinned;
    switch (sort) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'reference':
        return a.reference.localeCompare(b.reference);
      case 'date_asc':
        return a.createdAt - b.createdAt;
      default:
        return b.updatedAt - a.updatedAt;
    }
  });

  return rows.map(mapProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const db = getDb();
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function createProject(input: Partial<Project> = {}): Promise<Project> {
  const db = getDb();
  const now = Date.now();
  const row = {
    id: createId('prj'),
    folderId: input.folderId ?? null,
    title: input.title?.trim() || 'Untitled project',
    reference: input.reference ?? '',
    client: input.client ?? '',
    address: input.address ?? '',
    area: input.area ?? '',
    plotNumber: input.plotNumber ?? '',
    coverUri: null as string | null,
    intro: input.intro ?? '',
    summary: input.summary ?? '',
    notes: input.notes ?? '',
    pinned: input.pinned ?? 0,
    completed: 0,
    createdAt: now,
    updatedAt: now,
    latestReportUri: null as string | null,
    inspectionDate: input.inspectionDate ?? null,
    phase: input.phase ?? '',
    clientSignatureUri: null as string | null,
    clientSignedAt: null as number | null,
    deletedAt: null as number | null,
  };
  await db.insert(projects).values(row);
  return mapProject(row as any);
}

export async function updateProject(id: string, patch: Partial<Project>) {
  const db = getDb();
  const { id: _id, createdAt: _c, ...rest } = patch;
  await db
    .update(projects)
    .set({ ...rest, updatedAt: Date.now() } as any)
    .where(eq(projects.id, id));
}

export async function deleteProject(id: string) {
  const db = getDb();
  const issueRows = await db.select().from(issues).where(eq(issues.projectId, id));
  for (const issue of issueRows) {
    const imgs = await db.select().from(images).where(eq(images.issueId, issue.id));
    for (const img of imgs) {
      await deleteFileSafe(img.uri);
      await deleteFileSafe(img.annotatedUri);
      await deleteFileSafe(img.audioUri);
    }
    await deleteFileSafe(issue.audioUri);
    await db.delete(images).where(eq(images.issueId, issue.id));
  }
  await db.delete(issues).where(eq(issues.projectId, id));
  const plans = await db.select().from(floorPlans).where(eq(floorPlans.projectId, id));
  for (const plan of plans) {
    await deleteFileSafe(plan.uri);
    await db.delete(floorPlanPins).where(eq(floorPlanPins.floorPlanId, plan.id));
  }
  await db.delete(floorPlans).where(eq(floorPlans.projectId, id));
  const proj = await getProject(id);
  await deleteFileSafe(proj?.coverUri);
  await deleteFileSafe(proj?.latestReportUri);
  await deleteFileSafe(proj?.clientSignatureUri);
  try {
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}media/${id}/`, {
      idempotent: true,
    });
  } catch {
    /* ignore */
  }
  await db.delete(projects).where(eq(projects.id, id));
}

export async function duplicateProject(id: string): Promise<Project | null> {
  const source = await getProject(id);
  if (!source) return null;
  const copy = await createProject({
    title: `${source.title} (Copy)`,
    reference: source.reference,
    client: source.client,
    address: source.address,
    area: source.area,
    plotNumber: source.plotNumber,
    intro: source.intro,
    summary: source.summary,
    notes: source.notes,
    folderId: source.folderId,
    phase: source.phase,
    inspectionDate: source.inspectionDate,
  });
  let firstImageUri: string | null = null;
  const destDir = `${FileSystem.documentDirectory}media/${copy.id}/`;
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
  const issueList = await listIssues(id);
  for (const issue of issueList) {
    let issueAudioUri: string | null = null;
    if (issue.audioUri) {
      try {
        issueAudioUri = `${destDir}${createId('voice')}.m4a`;
        await FileSystem.copyAsync({ from: issue.audioUri, to: issueAudioUri });
      } catch {
        issueAudioUri = null;
      }
    }
    const newIssue = await createIssue(copy.id, {
      title: issue.title,
      assignee: issue.assignee,
      comments: issue.comments,
      dueDate: issue.dueDate,
      completed: issue.completed,
      priority: issue.priority,
      status: issue.status,
      category: issue.category,
      trade: issue.trade,
      location: issue.location,
      remedialNotes: issue.remedialNotes,
      audioUri: issueAudioUri,
    });
    const imgs = await listImages(issue.id);
    for (const img of imgs) {
      const ext = img.uri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
      const newUri = `${destDir}${createId('img')}.${ext}`;
      await FileSystem.copyAsync({ from: img.uri, to: newUri });
      if (!firstImageUri) firstImageUri = newUri;
      let annotatedUri: string | null = null;
      if (img.annotatedUri) {
        const aext = img.annotatedUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
        annotatedUri = `${destDir}${createId('ann')}.${aext}`;
        await FileSystem.copyAsync({ from: img.annotatedUri, to: annotatedUri });
      }
      let imgAudioUri: string | null = null;
      if (img.audioUri) {
        try {
          imgAudioUri = `${destDir}${createId('voice')}.m4a`;
          await FileSystem.copyAsync({ from: img.audioUri, to: imgAudioUri });
        } catch {
          imgAudioUri = null;
        }
      }
      await addImage(newIssue.id, {
        uri: newUri,
        annotatedUri,
        lat: img.lat,
        lon: img.lon,
        capturedAt: img.capturedAt,
        role: img.role,
        caption: img.caption,
        audioUri: imgAudioUri,
      });
    }
  }
  if (firstImageUri) await updateProject(copy.id, { coverUri: firstImageUri });
  return getProject(copy.id);
}

export async function listIssues(
  projectId: string,
  opts?: {
    newestFirst?: boolean;
    hideCompleted?: boolean;
    hideUnassigned?: boolean;
    status?: IssueStatus;
    priority?: IssuePriority;
    trade?: string;
    location?: string;
    search?: string;
  }
): Promise<Issue[]> {
  const db = getDb();
  let rows = await db.select().from(issues).where(eq(issues.projectId, projectId));
  if (opts?.hideCompleted) rows = rows.filter((i) => !i.completed && i.status !== 'closed');
  if (opts?.hideUnassigned) rows = rows.filter((i) => i.assignee.trim().length > 0);
  if (opts?.status) rows = rows.filter((i) => i.status === opts.status);
  if (opts?.priority) rows = rows.filter((i) => i.priority === opts.priority);
  if (opts?.trade) rows = rows.filter((i) => i.trade === opts.trade);
  if (opts?.location) rows = rows.filter((i) => i.location === opts.location);
  if (opts?.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    rows = rows.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.comments.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.trade.toLowerCase().includes(q) ||
        i.assignee.toLowerCase().includes(q)
    );
  }
  rows.sort((a, b) =>
    opts?.newestFirst ? b.createdAt - a.createdAt : a.sortOrder - b.sortOrder
  );
  return rows.map(mapIssue);
}

export async function getIssue(id: string): Promise<Issue | null> {
  const db = getDb();
  const rows = await db.select().from(issues).where(eq(issues.id, id)).limit(1);
  return rows[0] ? mapIssue(rows[0]) : null;
}

async function nextSnagNumber(projectId: string): Promise<number> {
  const sqlite = getSqlite();
  const maxRow = sqlite.getFirstSync<{ m: number | null }>(
    `SELECT MAX(snag_number) as m FROM issues WHERE project_id = ?`,
    [projectId]
  );
  return (maxRow?.m ?? 0) + 1;
}

export async function createIssue(projectId: string, input: Partial<Issue> = {}): Promise<Issue> {
  const db = getDb();
  const existing = await db.select().from(issues).where(eq(issues.projectId, projectId));
  const now = Date.now();
  const snagNumber = input.snagNumber ?? (await nextSnagNumber(projectId));
  const status = input.status ?? (input.completed ? 'closed' : 'open');
  const row = {
    id: createId('iss'),
    projectId,
    title: input.title ?? '',
    assignee: input.assignee ?? '',
    comments: input.comments ?? '',
    dueDate: input.dueDate ?? null,
    completed: input.completed ?? (status === 'closed' ? 1 : 0),
    sortOrder: existing.length,
    createdAt: now,
    snagNumber,
    priority: input.priority ?? '',
    status,
    category: input.category ?? '',
    trade: input.trade ?? '',
    location: input.location ?? '',
    remedialNotes: input.remedialNotes ?? '',
    closedAt: status === 'closed' ? now : null,
    audioUri: input.audioUri ?? null,
    deletedAt: null as number | null,
  };
  await db.insert(issues).values(row);
  await updateProject(projectId, {});
  return mapIssue(row as any);
}

export async function updateIssue(id: string, patch: Partial<Issue>) {
  const db = getDb();
  const { id: _id, projectId: _p, createdAt: _c, ...rest } = patch;
  if (rest.status === 'closed' || rest.completed === 1) {
    rest.completed = 1;
    rest.status = rest.status || 'closed';
    if (!rest.closedAt) rest.closedAt = Date.now();
  }
  if (rest.status && rest.status !== 'closed' && rest.completed === undefined) {
    rest.completed = 0;
    rest.closedAt = null;
  }
  if (rest.completed === 0) {
    rest.status = rest.status && rest.status !== 'closed' ? rest.status : 'open';
    rest.closedAt = null;
  }
  await db.update(issues).set(rest as any).where(eq(issues.id, id));
  const issue = await getIssue(id);
  if (issue) await updateProject(issue.projectId, {});
}

export async function deleteIssue(id: string) {
  const db = getDb();
  const issue = await getIssue(id);
  const imgs = await listImages(id);
  for (const img of imgs) {
    await deleteFileSafe(img.uri);
    await deleteFileSafe(img.annotatedUri);
    await deleteFileSafe(img.audioUri);
  }
  await deleteFileSafe(issue?.audioUri);
  await db.delete(images).where(eq(images.issueId, id));
  await db.delete(floorPlanPins).where(eq(floorPlanPins.issueId, id));
  await db.delete(issues).where(eq(issues.id, id));
  if (issue) {
    await clearCoverIfNeeded(
      issue.projectId,
      imgs.flatMap((i) => [i.uri, i.annotatedUri || ''].filter(Boolean))
    );
    await updateProject(issue.projectId, {});
  }
}

export async function multiUpdateIssues(
  ids: string[],
  patch: Partial<Pick<Issue, 'assignee' | 'dueDate' | 'completed' | 'status' | 'priority' | 'trade' | 'location'>>
) {
  if (!ids.length) return;
  const sqlite = getSqlite();
  await sqlite.withTransactionAsync(async () => {
    for (const id of ids) await updateIssue(id, patch);
  });
}

export async function deleteIssues(ids: string[]) {
  if (!ids.length) return;
  const sqlite = getSqlite();
  await sqlite.withTransactionAsync(async () => {
    for (const id of ids) await deleteIssue(id);
  });
}

export async function reorderIssues(projectId: string, orderedIds: string[]) {
  const db = getDb();
  const sqlite = getSqlite();
  await sqlite.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(issues).set({ sortOrder: i }).where(eq(issues.id, orderedIds[i]));
    }
    await updateProject(projectId, {});
  });
}

export async function listImages(issueId: string): Promise<IssueImage[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(images)
    .where(eq(images.issueId, issueId))
    .orderBy(asc(images.sortOrder));
  return rows.map(mapImage);
}

/** One query for first-thumb URIs across many issues (avoids N+1 on project hub). */
export async function listFirstImageUriByIssueIds(issueIds: string[]): Promise<Record<string, string>> {
  if (!issueIds.length) return {};
  const sqlite = getSqlite();
  const placeholders = issueIds.map(() => '?').join(',');
  const rows = sqlite.getAllSync<{ issue_id: string; uri: string; annotated_uri: string | null }>(
    `SELECT i.issue_id as issue_id, i.uri as uri, i.annotated_uri as annotated_uri
     FROM images i
     INNER JOIN (
       SELECT issue_id, MIN(sort_order) AS min_sort
       FROM images
       WHERE issue_id IN (${placeholders})
       GROUP BY issue_id
     ) t ON t.issue_id = i.issue_id AND t.min_sort = i.sort_order
     WHERE i.issue_id IN (${placeholders})`,
    [...issueIds, ...issueIds]
  );
  const out: Record<string, string> = {};
  for (const row of rows) {
    out[row.issue_id] = row.annotated_uri || row.uri;
  }
  return out;
}

export async function getImage(id: string): Promise<IssueImage | null> {
  const db = getDb();
  const rows = await db.select().from(images).where(eq(images.id, id)).limit(1);
  return rows[0] ? mapImage(rows[0]) : null;
}

export async function addImage(
  issueId: string,
  input: {
    uri: string;
    annotatedUri?: string | null;
    lat?: number | null;
    lon?: number | null;
    capturedAt?: number;
    role?: ImageRole;
    caption?: string;
    audioUri?: string | null;
  }
): Promise<IssueImage> {
  const db = getDb();
  const existing = await listImages(issueId);
  const row = {
    id: createId('img'),
    issueId,
    uri: input.uri,
    annotatedUri: input.annotatedUri ?? null,
    lat: input.lat ?? null,
    lon: input.lon ?? null,
    capturedAt: input.capturedAt ?? Date.now(),
    sortOrder: existing.length,
    role: input.role ?? 'evidence',
    caption: input.caption ?? '',
    audioUri: input.audioUri ?? null,
  };
  await db.insert(images).values(row);
  const issue = await getIssue(issueId);
  if (issue) {
    await updateProject(issue.projectId, {});
    const project = await getProject(issue.projectId);
    if (project && !project.coverUri) {
      await updateProject(issue.projectId, { coverUri: input.uri });
    }
  }
  return mapImage(row as any);
}

export async function updateImage(id: string, patch: Partial<IssueImage>) {
  const db = getDb();
  const prev = await getImage(id);
  const { id: _id, issueId: _i, ...rest } = patch;
  if (rest.annotatedUri && prev?.annotatedUri && rest.annotatedUri !== prev.annotatedUri) {
    await deleteFileSafe(prev.annotatedUri);
  }
  await db.update(images).set(rest as any).where(eq(images.id, id));
}

/** When cover still points at the original photo, point it at the annotated version. */
export async function refreshCoverAfterAnnotate(
  projectId: string,
  originalUri: string,
  annotatedUri: string
) {
  const project = await getProject(projectId);
  if (!project) return;
  if (!project.coverUri || project.coverUri === originalUri) {
    await updateProject(projectId, { coverUri: annotatedUri });
  }
}

async function clearCoverIfNeeded(projectId: string, deletedUris: string[]) {
  const project = await getProject(projectId);
  if (!project?.coverUri) return;
  if (!deletedUris.includes(project.coverUri)) return;
  const issueList = await listIssues(projectId);
  for (const issue of issueList) {
    const imgs = await listImages(issue.id);
    if (imgs[0]) {
      await updateProject(projectId, { coverUri: imgs[0].annotatedUri || imgs[0].uri });
      return;
    }
  }
  await updateProject(projectId, { coverUri: null });
}

export async function deleteImage(id: string) {
  const img = await getImage(id);
  if (!img) return;
  await deleteFileSafe(img.uri);
  await deleteFileSafe(img.annotatedUri);
  await deleteFileSafe(img.audioUri);
  const db = getDb();
  await db.delete(images).where(eq(images.id, id));
  const issue = await getIssue(img.issueId);
  if (issue) await clearCoverIfNeeded(issue.projectId, [img.uri, img.annotatedUri || '']);
}

export async function reorderImages(issueId: string, orderedIds: string[]) {
  const db = getDb();
  const sqlite = getSqlite();
  await sqlite.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(images).set({ sortOrder: i }).where(eq(images.id, orderedIds[i]));
    }
  });
}

export async function getIssueCounts(projectId: string) {
  const list = await listIssues(projectId);
  return {
    total: list.length,
    incomplete: list.filter((i) => !i.completed && i.status !== 'closed').length,
    completed: list.filter((i) => i.completed || i.status === 'closed').length,
  };
}

export type ProjectStats = {
  total: number;
  open: number;
  closed: number;
  critical: number;
  overdue: number;
  photos: number;
};

export type DashboardStats = {
  projects: number;
  openSnags: number;
  closedToday: number;
  criticalSnags: number;
};

const EMPTY_PROJECT_STATS: ProjectStats = {
  total: 0,
  open: 0,
  closed: 0,
  critical: 0,
  overdue: 0,
  photos: 0,
};

/** Batched per-project issue + photo counts for the home screen. */
export async function listProjectStats(): Promise<Record<string, ProjectStats>> {
  const sqlite = getSqlite();
  const now = Date.now();
  const issueRows = sqlite.getAllSync<{
    project_id: string;
    total: number;
    open_count: number;
    closed_count: number;
    critical_count: number;
    overdue_count: number;
  }>(
    `SELECT
       project_id,
       COUNT(*) AS total,
       SUM(CASE WHEN completed = 0 AND status != 'closed' THEN 1 ELSE 0 END) AS open_count,
       SUM(CASE WHEN completed = 1 OR status = 'closed' THEN 1 ELSE 0 END) AS closed_count,
       SUM(CASE WHEN priority = 'critical' AND completed = 0 AND status != 'closed' THEN 1 ELSE 0 END) AS critical_count,
       SUM(CASE WHEN due_date IS NOT NULL AND due_date < ? AND completed = 0 AND status != 'closed' THEN 1 ELSE 0 END) AS overdue_count
     FROM issues
     GROUP BY project_id`,
    [now]
  );
  const photoRows = sqlite.getAllSync<{ project_id: string; photos: number }>(
    `SELECT i.project_id AS project_id, COUNT(*) AS photos
     FROM images img
     INNER JOIN issues i ON i.id = img.issue_id
     GROUP BY i.project_id`
  );
  const out: Record<string, ProjectStats> = {};
  for (const row of issueRows) {
    out[row.project_id] = {
      total: row.total ?? 0,
      open: row.open_count ?? 0,
      closed: row.closed_count ?? 0,
      critical: row.critical_count ?? 0,
      overdue: row.overdue_count ?? 0,
      photos: 0,
    };
  }
  for (const row of photoRows) {
    const existing = out[row.project_id] ?? { ...EMPTY_PROJECT_STATS };
    existing.photos = row.photos ?? 0;
    out[row.project_id] = existing;
  }
  return out;
}

/** Global figures for the home stats bar. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const sqlite = getSqlite();
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();

  const projectRow = sqlite.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM projects`);
  const issueRow = sqlite.getFirstSync<{
    open_count: number;
    closed_today: number;
    critical_count: number;
  }>(
    `SELECT
       SUM(CASE WHEN completed = 0 AND status != 'closed' THEN 1 ELSE 0 END) AS open_count,
       SUM(CASE WHEN closed_at IS NOT NULL AND closed_at >= ? THEN 1 ELSE 0 END) AS closed_today,
       SUM(CASE WHEN priority = 'critical' AND completed = 0 AND status != 'closed' THEN 1 ELSE 0 END) AS critical_count
     FROM issues`,
    [todayStart]
  );

  return {
    projects: projectRow?.c ?? 0,
    openSnags: issueRow?.open_count ?? 0,
    closedToday: issueRow?.closed_today ?? 0,
    criticalSnags: issueRow?.critical_count ?? 0,
  };
}

export async function refreshProjectCompletion(projectId: string) {
  const counts = await getIssueCounts(projectId);
  if (counts.total > 0 && counts.incomplete === 0) {
    await updateProject(projectId, { completed: 1 });
  } else {
    await updateProject(projectId, { completed: 0 });
  }
}

// --- Contacts ---
export async function listContacts(): Promise<Contact[]> {
  const db = getDb();
  const rows = await db.select().from(contacts).orderBy(asc(contacts.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    trade: r.trade,
    phone: r.phone,
    createdAt: r.createdAt,
  }));
}

export async function createContact(input: Partial<Contact>): Promise<Contact> {
  const db = getDb();
  const row = {
    id: createId('ctc'),
    name: input.name?.trim() || 'Contact',
    trade: input.trade ?? '',
    phone: input.phone ?? '',
    createdAt: Date.now(),
  };
  await db.insert(contacts).values(row);
  return row;
}

export async function deleteContact(id: string) {
  await getDb().delete(contacts).where(eq(contacts.id, id));
}

// --- Templates ---
export async function listTemplates(): Promise<(Template & { itemCount: number })[]> {
  const db = getDb();
  const all = await db.select().from(templates).orderBy(asc(templates.title));
  const out = [];
  for (const t of all) {
    const items = await db.select().from(templateItems).where(eq(templateItems.templateId, t.id));
    out.push({ id: t.id, title: t.title, createdAt: t.createdAt, itemCount: items.length });
  }
  return out;
}

export async function getTemplateItems(templateId: string): Promise<TemplateItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(templateItems)
    .where(eq(templateItems.templateId, templateId))
    .orderBy(asc(templateItems.sortOrder));
  return rows.map((r) => ({
    id: r.id,
    templateId: r.templateId,
    title: r.title,
    trade: r.trade,
    location: r.location,
    priority: (r.priority as IssuePriority | '') || '',
    sortOrder: r.sortOrder,
  }));
}

export async function applyTemplateToProject(projectId: string, templateId: string) {
  const items = await getTemplateItems(templateId);
  const sqlite = getSqlite();
  await sqlite.withTransactionAsync(async () => {
    for (const item of items) {
      await createIssue(projectId, {
        title: item.title,
        trade: item.trade,
        location: item.location,
        priority: item.priority,
      });
    }
  });
}

export async function createTemplate(title: string, items: Partial<TemplateItem>[]): Promise<Template> {
  const db = getDb();
  const row = { id: createId('tmpl'), title: title.trim() || 'Template', createdAt: Date.now() };
  await db.insert(templates).values(row);
  for (let i = 0; i < items.length; i++) {
    await db.insert(templateItems).values({
      id: createId('ti'),
      templateId: row.id,
      title: items[i].title || `Item ${i + 1}`,
      trade: items[i].trade || '',
      location: items[i].location || '',
      priority: items[i].priority || '',
      sortOrder: i,
    });
  }
  return row;
}

// --- Floor plans ---
export async function listFloorPlans(projectId: string): Promise<FloorPlan[]> {
  const db = getDb();
  const rows = await db.select().from(floorPlans).where(eq(floorPlans.projectId, projectId));
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    uri: r.uri,
    createdAt: r.createdAt,
  }));
}

export async function createFloorPlan(projectId: string, title: string, uri: string) {
  const db = getDb();
  const row = {
    id: createId('fp'),
    projectId,
    title: title || 'Floor plan',
    uri,
    createdAt: Date.now(),
  };
  await db.insert(floorPlans).values(row);
  return row;
}

export async function listPins(floorPlanId: string): Promise<FloorPlanPin[]> {
  const db = getDb();
  const rows = await db.select().from(floorPlanPins).where(eq(floorPlanPins.floorPlanId, floorPlanId));
  return rows.map((r) => ({
    id: r.id,
    floorPlanId: r.floorPlanId,
    issueId: r.issueId,
    x: r.x,
    y: r.y,
  }));
}

export async function upsertPin(floorPlanId: string, issueId: string, x: number, y: number) {
  const db = getDb();
  const existing = await db
    .select()
    .from(floorPlanPins)
    .where(eq(floorPlanPins.issueId, issueId));
  const forPlan = existing.find((p) => p.floorPlanId === floorPlanId);
  if (forPlan) {
    await db.update(floorPlanPins).set({ x, y }).where(eq(floorPlanPins.id, forPlan.id));
    return forPlan.id;
  }
  const id = createId('pin');
  await db.insert(floorPlanPins).values({ id, floorPlanId, issueId, x, y });
  return id;
}
