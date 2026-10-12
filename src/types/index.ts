export type IssueStatus = 'open' | 'in_progress' | 'ready_for_reinspect' | 'closed' | 'disputed';
export type IssuePriority = 'critical' | 'high' | 'medium' | 'low';
export type ImageRole = 'evidence' | 'before' | 'after' | 'context';

export type Folder = {
  id: string;
  title: string;
  color: string;
  sortKey: number;
  createdAt: number;
};

export type Project = {
  id: string;
  folderId: string | null;
  title: string;
  reference: string;
  client: string;
  address: string;
  area: string;
  plotNumber: string;
  coverUri: string | null;
  intro: string;
  summary: string;
  notes: string;
  pinned: number;
  completed: number;
  createdAt: number;
  updatedAt: number;
  latestReportUri: string | null;
  inspectionDate: number | null;
  phase: string;
  clientSignatureUri: string | null;
  clientSignedAt: number | null;
  deletedAt: number | null;
};

export type Issue = {
  id: string;
  projectId: string;
  title: string;
  assignee: string;
  comments: string;
  dueDate: number | null;
  completed: number;
  sortOrder: number;
  createdAt: number;
  snagNumber: number | null;
  priority: IssuePriority | '';
  status: IssueStatus;
  category: string;
  trade: string;
  location: string;
  remedialNotes: string;
  closedAt: number | null;
  audioUri: string | null;
  deletedAt: number | null;
};

export type IssueImage = {
  id: string;
  issueId: string;
  uri: string;
  annotatedUri: string | null;
  lat: number | null;
  lon: number | null;
  capturedAt: number;
  sortOrder: number;
  role: ImageRole;
  caption: string;
  audioUri: string | null;
};

export type Contact = {
  id: string;
  name: string;
  trade: string;
  phone: string;
  createdAt: number;
};

export type Template = {
  id: string;
  title: string;
  createdAt: number;
};

export type TemplateItem = {
  id: string;
  templateId: string;
  title: string;
  trade: string;
  location: string;
  priority: IssuePriority | '';
  sortOrder: number;
};

export type FloorPlan = {
  id: string;
  projectId: string;
  title: string;
  uri: string;
  createdAt: number;
};

export type FloorPlanPin = {
  id: string;
  floorPlanId: string;
  issueId: string;
  x: number;
  y: number;
};

export type WordingConfig = {
  issueSingular: string;
  issuePlural: string;
  identifiedPhrase: string;
  incompletePhrase: string;
  preparedFor: string;
  auditorLabel: string;
};

export type AppSettings = {
  id: number;
  companyName: string;
  logoUri: string | null;
  auditorName: string;
  signatureUri: string | null;
  wordingJson: string;
  appearance: 'system' | 'light' | 'dark';
  useSquareImages: number;
  imageQuality: number;
  sfxEnabled: number;
  defaultThemeId: string;
  customAccent: string;
  reportShowTimestamps: number;
  reportShowGps: number;
  reportShowPageNumbers: number;
  reportShowIntro: number;
  reportShowSummary: number;
  reportShowCounts: number;
  hideCompletedProjects: number;
  projectSort: 'title' | 'reference' | 'date_desc' | 'date_asc';
  folderSort: 'name' | 'count';
  onboardingDone: number;
  highContrast: number;
  hapticsEnabled: number;
};

export type ReportThemeId =
  | 'steel'
  | 'blueprint'
  | 'site'
  | 'ledger'
  | 'safety'
  | 'slate'
  | 'timber'
  | 'concrete';

export const DEFAULT_WORDING: WordingConfig = {
  issueSingular: 'Issue',
  issuePlural: 'Issues',
  identifiedPhrase: 'Identified',
  incompletePhrase: 'Incomplete',
  preparedFor: 'Prepared for',
  auditorLabel: 'Auditor',
};

export const FOLDER_COLORS = [
  '#C45C26',
  '#2F5D50',
  '#3D5A80',
  '#8B4513',
  '#B8860B',
  '#4A5568',
  '#9B2C2C',
  '#2B6CB0',
];

export const PRIORITIES: IssuePriority[] = ['critical', 'high', 'medium', 'low'];
export const STATUSES: IssueStatus[] = [
  'open',
  'in_progress',
  'ready_for_reinspect',
  'closed',
  'disputed',
];
