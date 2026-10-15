import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import JSZip from 'jszip';
import type { ReportThemeId } from '../types';
import { buildCsv, buildQrSvg, buildReportHtml } from './reportBuilder';
import { buildPlayStoreQrSvg, PLAY_STORE_URL } from './appPromo';
import type { AppSettings, Issue, IssueImage, Project, WordingConfig } from '../types';
import { sanitizeFilename } from '../utils/id';
import * as repo from '../db/repository';
import { embedMany, uriToDataUri } from './imageEmbed';

export async function loadProjectReportData(projectId: string) {
  const project = await repo.getProject(projectId);
  if (!project) throw new Error('Project not found');
  const issueList = await repo.listIssues(projectId);
  const issues: (Issue & { images: IssueImage[] })[] = [];
  for (const issue of issueList) {
    const imgs = await repo.listImages(issue.id);
    issues.push({ ...issue, images: imgs });
  }
  const settings = await repo.getSettings();
  const wording = repo.parseWording(settings.wordingJson);
  return { project, issues, settings, wording };
}

async function resolveBrandLogoDataUri(): Promise<string | null> {
  try {
    const asset = Asset.fromModule(require('../../assets/images/brand-icon.png'));
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    return uriToDataUri(uri);
  } catch {
    return null;
  }
}

export async function buildEmbeddedHtml(
  opts: {
    project: Project;
    issues: (Issue & { images: IssueImage[] })[];
    settings: AppSettings;
    wording: WordingConfig;
    themeId: ReportThemeId;
    accentOverride?: string;
    openOnly?: boolean;
    groupBy?: 'none' | 'location' | 'trade' | 'priority';
    includeQr?: boolean;
    includeAppPromo?: boolean;
  },
  onProgress?: (done: number, total: number) => void
) {
  const uris: (string | null)[] = [
    opts.project.coverUri,
    opts.settings.logoUri,
    opts.settings.signatureUri,
    opts.project.clientSignatureUri,
  ];
  for (const issue of opts.issues) {
    for (const img of issue.images) {
      uris.push(img.annotatedUri || img.uri);
    }
  }
  const embeds = await embedMany(uris, onProgress);
  const qrSvg = opts.includeQr
    ? buildQrSvg(`${opts.project.title} | ${opts.project.reference} | ${new Date().toISOString().slice(0, 10)}`)
    : null;

  // The promo block advertises our Android listing (Play Store URL + QR code) and
  // calls it out by name. App Review Guideline 2.3.10 forbids names and imagery of
  // other mobile platforms inside the app, so this is Android-only: on iOS it
  // always resolves to null and reportBuilder omits the block entirely.
  const includeAppPromo = Platform.OS === 'android' && opts.includeAppPromo !== false;
  const appPromo = includeAppPromo
    ? {
        logoDataUri: await resolveBrandLogoDataUri(),
        qrSvg: buildPlayStoreQrSvg(132),
        playStoreUrl: PLAY_STORE_URL,
      }
    : null;

  return buildReportHtml({ ...opts, embeds, qrSvg, appPromo });
}

export async function generatePdf(
  opts: {
    project: Project;
    issues: (Issue & { images: IssueImage[] })[];
    settings: AppSettings;
    wording: WordingConfig;
    themeId: ReportThemeId;
    accentOverride?: string;
    openOnly?: boolean;
    groupBy?: 'none' | 'location' | 'trade' | 'priority';
    includeQr?: boolean;
    includeAppPromo?: boolean;
  },
  onProgress?: (done: number, total: number) => void
): Promise<string> {
  const html = await buildEmbeddedHtml(opts, onProgress);
  const { uri } = await Print.printToFileAsync({ html });
  const dir = `${FileSystem.documentDirectory}reports/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const name = sanitizeFilename(`${opts.project.title}_${opts.project.reference || 'report'}`);
  const dest = `${dir}${name}_${Date.now()}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  await repo.updateProject(opts.project.id, { latestReportUri: dest });
  return dest;
}

export async function generateCsvFile(opts: {
  project: Project;
  issues: (Issue & { images: IssueImage[] })[];
  wording: WordingConfig;
  openOnly?: boolean;
}): Promise<string> {
  const issues = opts.openOnly
    ? opts.issues.filter((i) => !i.completed && i.status !== 'closed')
    : opts.issues;
  const csv = buildCsv({ ...opts, issues });
  const dir = `${FileSystem.documentDirectory}reports/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const name = sanitizeFilename(`${opts.project.title}_issues`);
  const dest = `${dir}${name}_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(dest, csv, { encoding: FileSystem.EncodingType.UTF8 });
  return dest;
}

export async function generateZipBundle(
  opts: Parameters<typeof generatePdf>[0],
  onProgress?: (done: number, total: number) => void
): Promise<string> {
  const pdfUri = await generatePdf(opts, onProgress);
  const csvUri = await generateCsvFile(opts);
  const zip = new JSZip();
  const pdfB64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const csvText = await FileSystem.readAsStringAsync(csvUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  zip.file('report.pdf', pdfB64, { base64: true });
  zip.file('issues.csv', csvText);

  let imgIndex = 0;
  const zipIssues = opts.openOnly
    ? opts.issues.filter((i) => !i.completed && i.status !== 'closed')
    : opts.issues;
  for (const issue of zipIssues) {
    for (const img of issue.images) {
      const src = img.annotatedUri || img.uri;
      try {
        const b64 = await FileSystem.readAsStringAsync(src, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const ext = src.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
        zip.file(
          `images/${String(++imgIndex).padStart(3, '0')}_${sanitizeFilename(issue.title || 'issue')}.${ext}`,
          b64,
          { base64: true }
        );
      } catch {
        /* skip */
      }
    }
    if (issue.audioUri) {
      try {
        const b64 = await FileSystem.readAsStringAsync(issue.audioUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        zip.file(`audio/snag_${issue.snagNumber || issue.id}.m4a`, b64, { base64: true });
      } catch {
        /* skip */
      }
    }
  }

  const outB64 = await zip.generateAsync({ type: 'base64' });
  const dir = `${FileSystem.documentDirectory}reports/`;
  const name = sanitizeFilename(`${opts.project.title}_bundle`);
  const dest = `${dir}${name}_${Date.now()}.zip`;
  await FileSystem.writeAsStringAsync(dest, outB64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
}

export async function shareFile(uri: string) {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri);
}
