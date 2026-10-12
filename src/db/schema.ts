import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  color: text('color').notNull(),
  sortKey: integer('sort_key').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  folderId: text('folder_id'),
  title: text('title').notNull(),
  reference: text('reference').notNull().default(''),
  client: text('client').notNull().default(''),
  address: text('address').notNull().default(''),
  area: text('area').notNull().default(''),
  plotNumber: text('plot_number').notNull().default(''),
  coverUri: text('cover_uri'),
  intro: text('intro').notNull().default(''),
  summary: text('summary').notNull().default(''),
  notes: text('notes').notNull().default(''),
  pinned: integer('pinned').notNull().default(0),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  latestReportUri: text('latest_report_uri'),
  inspectionDate: integer('inspection_date'),
  phase: text('phase').notNull().default(''),
  clientSignatureUri: text('client_signature_uri'),
  clientSignedAt: integer('client_signed_at'),
  deletedAt: integer('deleted_at'),
});

export const issues = sqliteTable('issues', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull().default(''),
  assignee: text('assignee').notNull().default(''),
  comments: text('comments').notNull().default(''),
  dueDate: integer('due_date'),
  completed: integer('completed').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  snagNumber: integer('snag_number'),
  priority: text('priority').notNull().default(''),
  status: text('status').notNull().default('open'),
  category: text('category').notNull().default(''),
  trade: text('trade').notNull().default(''),
  location: text('location').notNull().default(''),
  remedialNotes: text('remedial_notes').notNull().default(''),
  closedAt: integer('closed_at'),
  audioUri: text('audio_uri'),
  deletedAt: integer('deleted_at'),
});

export const images = sqliteTable('images', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull(),
  uri: text('uri').notNull(),
  annotatedUri: text('annotated_uri'),
  lat: real('lat'),
  lon: real('lon'),
  capturedAt: integer('captured_at').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  role: text('role').notNull().default('evidence'),
  caption: text('caption').notNull().default(''),
  audioUri: text('audio_uri'),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  companyName: text('company_name').notNull().default(''),
  logoUri: text('logo_uri'),
  auditorName: text('auditor_name').notNull().default(''),
  signatureUri: text('signature_uri'),
  wordingJson: text('wording_json').notNull(),
  appearance: text('appearance').notNull().default('dark'),
  useSquareImages: integer('use_square_images').notNull().default(0),
  imageQuality: integer('image_quality').notNull().default(80),
  sfxEnabled: integer('sfx_enabled').notNull().default(1),
  defaultThemeId: text('default_theme_id').notNull().default('steel'),
  customAccent: text('custom_accent').notNull().default('#2F6B3A'),
  reportShowTimestamps: integer('report_show_timestamps').notNull().default(1),
  reportShowGps: integer('report_show_gps').notNull().default(1),
  reportShowPageNumbers: integer('report_show_page_numbers').notNull().default(1),
  reportShowIntro: integer('report_show_intro').notNull().default(1),
  reportShowSummary: integer('report_show_summary').notNull().default(1),
  reportShowCounts: integer('report_show_counts').notNull().default(1),
  hideCompletedProjects: integer('hide_completed_projects').notNull().default(0),
  projectSort: text('project_sort').notNull().default('date_desc'),
  folderSort: text('folder_sort').notNull().default('name'),
  onboardingDone: integer('onboarding_done').notNull().default(0),
  highContrast: integer('high_contrast').notNull().default(0),
  hapticsEnabled: integer('haptics_enabled').notNull().default(1),
});

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  trade: text('trade').notNull().default(''),
  phone: text('phone').notNull().default(''),
  createdAt: integer('created_at').notNull(),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const templateItems = sqliteTable('template_items', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull(),
  title: text('title').notNull(),
  trade: text('trade').notNull().default(''),
  location: text('location').notNull().default(''),
  priority: text('priority').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const floorPlans = sqliteTable('floor_plans', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  uri: text('uri').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const floorPlanPins = sqliteTable('floor_plan_pins', {
  id: text('id').primaryKey(),
  floorPlanId: text('floor_plan_id').notNull(),
  issueId: text('issue_id').notNull(),
  x: real('x').notNull(),
  y: real('y').notNull(),
});
