import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';
import { getSqlite, migrateDatabase, resetDatabaseConnection } from '../db/client';
import { sanitizeFilename } from '../utils/id';

function sqliteCandidates(): string[] {
  const doc = FileSystem.documentDirectory || '';
  return [`${doc}SQLite/site_audit_max.db`, `${doc}site_audit_max.db`];
}

async function findSqliteFile(): Promise<string | null> {
  for (const path of sqliteCandidates()) {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) return path;
  }
  return null;
}

export async function exportLocalBackup() {
  const sqlite = getSqlite();
  try {
    sqlite.execSync('PRAGMA wal_checkpoint(FULL);');
  } catch {
    /* ignore */
  }

  const dbPath = await findSqliteFile();
  if (!dbPath) {
    throw new Error('Could not find the local database to back up.');
  }

  const zip = new JSZip();
  zip.file(
    'readme.txt',
    [
      'Site Audit Max full backup.',
      'Contains SQLite database + media + branding.',
      'Generated PDF/CSV files under reports/ are not included — re-export after restore.',
      'Media may include GPS coordinates from photos; keep backups private.',
      'Restore from Settings.',
    ].join('\n')
  );
  zip.file(
    'meta.json',
    JSON.stringify(
      { app: 'site-audit-max', version: 2, exportedAt: new Date().toISOString() },
      null,
      2
    )
  );

  const b64 = await FileSystem.readAsStringAsync(dbPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  zip.file('database/site_audit_max.db', b64, { base64: true });

  const mediaRoot = `${FileSystem.documentDirectory}media/`;
  const mediaInfo = await FileSystem.getInfoAsync(mediaRoot);
  if (mediaInfo.exists) {
    const projects = await FileSystem.readDirectoryAsync(mediaRoot);
    for (const projectId of projects) {
      const dir = `${mediaRoot}${projectId}/`;
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists || !info.isDirectory) continue;
      const files = await FileSystem.readDirectoryAsync(dir);
      for (const file of files) {
        const uri = `${dir}${file}`;
        const fileB64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        zip.file(`media/${projectId}/${file}`, fileB64, { base64: true });
      }
    }
  }

  const brandingRoot = `${FileSystem.documentDirectory}branding/`;
  const brandInfo = await FileSystem.getInfoAsync(brandingRoot);
  if (brandInfo.exists) {
    const files = await FileSystem.readDirectoryAsync(brandingRoot);
    for (const file of files) {
      const uri = `${brandingRoot}${file}`;
      const fileB64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      zip.file(`branding/${file}`, fileB64, { base64: true });
    }
  }

  const outB64 = await zip.generateAsync({ type: 'base64' });
  const dest = `${FileSystem.documentDirectory}backup_${sanitizeFilename(new Date().toISOString())}.zip`;
  await FileSystem.writeAsStringAsync(dest, outB64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest);
  }
  return dest;
}

export async function importLocalBackup(): Promise<void> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/zip',
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) throw new Error('No backup selected');

  const b64 = await FileSystem.readAsStringAsync(picked.assets[0].uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(b64, { base64: true });

  const dbEntry = zip.file('database/site_audit_max.db');
  if (!dbEntry) throw new Error('Backup is missing database/site_audit_max.db');

  // Drop live connection before overwriting the DB file.
  resetDatabaseConnection();

  const dbB64 = await dbEntry.async('base64');
  const target = `${FileSystem.documentDirectory}SQLite/site_audit_max.db`;
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite/`, {
    intermediates: true,
  });
  await FileSystem.writeAsStringAsync(target, dbB64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Replace media tree so orphans from the previous install are not left behind.
  const mediaRoot = `${FileSystem.documentDirectory}media/`;
  try {
    await FileSystem.deleteAsync(mediaRoot, { idempotent: true });
  } catch {
    /* ignore */
  }
  await FileSystem.makeDirectoryAsync(mediaRoot, { intermediates: true });
  const mediaFiles = Object.keys(zip.files).filter((k) => k.startsWith('media/') && !zip.files[k].dir);
  for (const path of mediaFiles) {
    const data = await zip.file(path)!.async('base64');
    const dest = `${FileSystem.documentDirectory}${path}`;
    const dir = dest.slice(0, dest.lastIndexOf('/') + 1);
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.writeAsStringAsync(dest, data, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  try {
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}branding/`, { idempotent: true });
  } catch {
    /* ignore */
  }
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}branding/`, {
    intermediates: true,
  });
  const brandFiles = Object.keys(zip.files).filter(
    (k) => k.startsWith('branding/') && !zip.files[k].dir
  );
  for (const path of brandFiles) {
    const data = await zip.file(path)!.async('base64');
    const dest = `${FileSystem.documentDirectory}${path}`;
    await FileSystem.writeAsStringAsync(dest, data, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  migrateDatabase();
}
