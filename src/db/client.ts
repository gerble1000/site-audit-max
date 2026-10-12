import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { DEFAULT_WORDING } from '../types';

let _db: ExpoSQLiteDatabase<typeof schema> | null = null;
let _sqlite: SQLiteDatabase | null = null;

export function getSqlite(): SQLiteDatabase {
  if (!_sqlite) {
    _sqlite = openDatabaseSync('site_audit_max.db');
  }
  return _sqlite;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getSqlite(), { schema });
  }
  return _db;
}

/** Close and drop the singleton so restore/re-open uses a fresh connection. */
export function resetDatabaseConnection() {
  try {
    _sqlite?.closeSync?.();
  } catch {
    /* ignore */
  }
  _sqlite = null;
  _db = null;
}

function columnExists(sqlite: SQLiteDatabase, table: string, column: string) {
  const rows = sqlite.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((r) => r.name === column);
}

function addColumn(sqlite: SQLiteDatabase, table: string, column: string, ddl: string) {
  if (!columnExists(sqlite, table, column)) {
    sqlite.execSync(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

export function migrateDatabase() {
  const sqlite = getSqlite();
  sqlite.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_key INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      folder_id TEXT,
      title TEXT NOT NULL,
      reference TEXT NOT NULL DEFAULT '',
      client TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      cover_uri TEXT,
      intro TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      latest_report_uri TEXT
    );
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      assignee TEXT NOT NULL DEFAULT '',
      comments TEXT NOT NULL DEFAULT '',
      due_date INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY NOT NULL,
      issue_id TEXT NOT NULL,
      uri TEXT NOT NULL,
      annotated_uri TEXT,
      lat REAL,
      lon REAL,
      captured_at INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY NOT NULL,
      company_name TEXT NOT NULL DEFAULT '',
      logo_uri TEXT,
      auditor_name TEXT NOT NULL DEFAULT '',
      signature_uri TEXT,
      wording_json TEXT NOT NULL,
      appearance TEXT NOT NULL DEFAULT 'dark',
      use_square_images INTEGER NOT NULL DEFAULT 0,
      image_quality INTEGER NOT NULL DEFAULT 80,
      sfx_enabled INTEGER NOT NULL DEFAULT 1,
      default_theme_id TEXT NOT NULL DEFAULT 'steel',
      custom_accent TEXT NOT NULL DEFAULT '#5BA3F5',
      report_show_timestamps INTEGER NOT NULL DEFAULT 1,
      report_show_gps INTEGER NOT NULL DEFAULT 1,
      report_show_page_numbers INTEGER NOT NULL DEFAULT 1,
      report_show_intro INTEGER NOT NULL DEFAULT 1,
      report_show_summary INTEGER NOT NULL DEFAULT 1,
      report_show_counts INTEGER NOT NULL DEFAULT 1,
      hide_completed_projects INTEGER NOT NULL DEFAULT 0,
      project_sort TEXT NOT NULL DEFAULT 'date_desc',
      folder_sort TEXT NOT NULL DEFAULT 'name',
      onboarding_done INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      trade TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS template_items (
      id TEXT PRIMARY KEY NOT NULL,
      template_id TEXT NOT NULL,
      title TEXT NOT NULL,
      trade TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS floor_plans (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      uri TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS floor_plan_pins (
      id TEXT PRIMARY KEY NOT NULL,
      floor_plan_id TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
    CREATE INDEX IF NOT EXISTS idx_images_issue ON images(issue_id);
    CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id);
  `);

  addColumn(sqlite, 'projects', 'inspection_date', 'inspection_date INTEGER');
  addColumn(sqlite, 'projects', 'phase', "phase TEXT NOT NULL DEFAULT ''");
  addColumn(sqlite, 'projects', 'client_signature_uri', 'client_signature_uri TEXT');
  addColumn(sqlite, 'projects', 'client_signed_at', 'client_signed_at INTEGER');
  addColumn(sqlite, 'projects', 'deleted_at', 'deleted_at INTEGER');
  addColumn(sqlite, 'projects', 'area', "area TEXT NOT NULL DEFAULT ''");
  addColumn(sqlite, 'projects', 'plot_number', "plot_number TEXT NOT NULL DEFAULT ''");

  addColumn(sqlite, 'issues', 'snag_number', 'snag_number INTEGER');
  addColumn(sqlite, 'issues', 'priority', "priority TEXT NOT NULL DEFAULT ''");
  addColumn(sqlite, 'issues', 'status', "status TEXT NOT NULL DEFAULT 'open'");
  addColumn(sqlite, 'issues', 'category', "category TEXT NOT NULL DEFAULT ''");
  addColumn(sqlite, 'issues', 'trade', "trade TEXT NOT NULL DEFAULT ''");
  addColumn(sqlite, 'issues', 'location', "location TEXT NOT NULL DEFAULT ''");
  addColumn(sqlite, 'issues', 'remedial_notes', "remedial_notes TEXT NOT NULL DEFAULT ''");
  addColumn(sqlite, 'issues', 'closed_at', 'closed_at INTEGER');
  addColumn(sqlite, 'issues', 'audio_uri', 'audio_uri TEXT');
  addColumn(sqlite, 'issues', 'deleted_at', 'deleted_at INTEGER');

  addColumn(sqlite, 'images', 'role', "role TEXT NOT NULL DEFAULT 'evidence'");
  addColumn(sqlite, 'images', 'caption', "caption TEXT NOT NULL DEFAULT ''");
  addColumn(sqlite, 'images', 'audio_uri', 'audio_uri TEXT');

  addColumn(sqlite, 'settings', 'high_contrast', 'high_contrast INTEGER NOT NULL DEFAULT 0');
  addColumn(sqlite, 'settings', 'haptics_enabled', 'haptics_enabled INTEGER NOT NULL DEFAULT 1');

  const row = sqlite.getFirstSync<{ id: number }>('SELECT id FROM settings WHERE id = 1');
  if (!row) {
    sqlite.runSync(
      `INSERT INTO settings (id, wording_json, appearance, custom_accent) VALUES (1, ?, 'dark', '#2F6B3A')`,
      [JSON.stringify(DEFAULT_WORDING)]
    );
  }

  // Backfill snag numbers for existing issues missing them
  const projects = sqlite.getAllSync<{ id: string }>('SELECT id FROM projects');
  for (const p of projects) {
    const missing = sqlite.getAllSync<{ id: string }>(
      `SELECT id FROM issues WHERE project_id = ? AND snag_number IS NULL ORDER BY sort_order, created_at`,
      [p.id]
    );
    if (!missing.length) continue;
    const maxRow = sqlite.getFirstSync<{ m: number | null }>(
      `SELECT MAX(snag_number) as m FROM issues WHERE project_id = ?`,
      [p.id]
    );
    let n = (maxRow?.m ?? 0) + 1;
    for (const iss of missing) {
      sqlite.runSync(`UPDATE issues SET snag_number = ? WHERE id = ?`, [n++, iss.id]);
    }
  }

  // Seed a default handover template if none exist
  const tmplCount = sqlite.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM templates');
  if ((tmplCount?.c ?? 0) === 0) {
    const tid = `tmpl_handover`;
    const now = Date.now();
    sqlite.runSync(`INSERT INTO templates (id, title, created_at) VALUES (?, ?, ?)`, [
      tid,
      'Handover apartment',
      now,
    ]);
    const items = [
      ['Kitchen finishes', 'Finishes', 'Kitchen', 'medium'],
      ['Bathroom sealant', 'Plumbing', 'Bathroom', 'high'],
      ['Door ironmongery', 'Carpentry', 'Hall', 'low'],
      ['Paint touch-ups', 'Decoration', 'Living', 'medium'],
      ['Electrical fittings', 'Electrical', 'All', 'high'],
    ];
    items.forEach((it, i) => {
      sqlite.runSync(
        `INSERT INTO template_items (id, template_id, title, trade, location, priority, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`ti_${i}`, tid, it[0], it[1], it[2], it[3], i]
      );
    });
  }

  sqlite.execSync(`
    CREATE INDEX IF NOT EXISTS idx_images_issue_sort ON images(issue_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
    CREATE INDEX IF NOT EXISTS idx_template_items_template ON template_items(template_id);
    CREATE INDEX IF NOT EXISTS idx_floor_plans_project ON floor_plans(project_id);
    CREATE INDEX IF NOT EXISTS idx_floor_pins_plan ON floor_plan_pins(floor_plan_id);
  `);
}

export function getDatabasePathHint(): string {
  return `${FileSystemDocumentDir()}SQLite/site_audit_max.db`;
}

function FileSystemDocumentDir() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FS = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
    return FS.documentDirectory || '';
  } catch {
    return '';
  }
}
