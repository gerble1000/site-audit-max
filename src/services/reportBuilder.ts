import type { AppSettings, Issue, IssueImage, Project, ReportThemeId, WordingConfig } from '../types';

export type { ReportThemeId };

export type ReportTheme = {
  id: ReportThemeId;
  name: string;
  headerBg: string;
  accent: string;
  text: string;
  muted: string;
  surface: string;
  border: string;
};

export const REPORT_THEMES: ReportTheme[] = [
  { id: 'steel', name: 'Steel', headerBg: '#1C2430', accent: '#2F6B3A', text: '#121820', muted: '#6B7785', surface: '#F4F6F8', border: '#D0D7DE' },
  { id: 'blueprint', name: 'Blueprint', headerBg: '#1B3A5F', accent: '#4FC3F7', text: '#0D1B2A', muted: '#415A77', surface: '#E8F1F8', border: '#90A4AE' },
  { id: 'site', name: 'Site Walk', headerBg: '#2F5D50', accent: '#C45C26', text: '#1A2E28', muted: '#5C7A70', surface: '#F0F5F3', border: '#B7C9C2' },
  { id: 'ledger', name: 'Ledger', headerBg: '#2C2C2C', accent: '#B8860B', text: '#1A1A1A', muted: '#666', surface: '#FAFAF7', border: '#CCC' },
  { id: 'safety', name: 'Safety', headerBg: '#7A1F1F', accent: '#F4A261', text: '#2B1008', muted: '#7A5C4E', surface: '#FFF6F0', border: '#E6C9B8' },
  { id: 'slate', name: 'Slate', headerBg: '#334155', accent: '#38BDF8', text: '#0F172A', muted: '#64748B', surface: '#F8FAFC', border: '#CBD5E1' },
  { id: 'timber', name: 'Timber', headerBg: '#5C3A21', accent: '#D97706', text: '#2A180C', muted: '#7C5A3E', surface: '#FBF6F0', border: '#E2D2C0' },
  { id: 'concrete', name: 'Concrete', headerBg: '#4B5563', accent: '#9CA3AF', text: '#111827', muted: '#6B7280', surface: '#F3F4F6', border: '#D1D5DB' },
];

export function esc(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveUri(uri: string | null | undefined, embeds?: Map<string, string>): string | null {
  if (!uri) return null;
  if (uri.startsWith('data:')) return uri;
  return embeds?.get(uri) ?? null;
}

export type ReportIssue = Issue & { images: IssueImage[] };

export function buildReportHtml(opts: {
  project: Project;
  issues: ReportIssue[];
  settings: AppSettings;
  wording: WordingConfig;
  themeId: ReportThemeId;
  accentOverride?: string;
  embeds?: Map<string, string>;
  openOnly?: boolean;
  groupBy?: 'none' | 'location' | 'trade' | 'priority';
  qrSvg?: string | null;
  appPromo?: {
    logoDataUri: string | null;
    qrSvg: string;
    playStoreUrl: string;
  } | null;
}): string {
  const theme = REPORT_THEMES.find((t) => t.id === opts.themeId) ?? REPORT_THEMES[0];
  const accent = opts.accentOverride || opts.settings.customAccent || theme.accent;
  const { project, settings, wording, embeds } = opts;
  let issueList = [...opts.issues];
  if (opts.openOnly) issueList = issueList.filter((i) => !i.completed && i.status !== 'closed');

  const incomplete = issueList.filter((i) => !i.completed && i.status !== 'closed').length;
  const total = issueList.length;

  const renderIssue = (issue: ReportIssue, idx: number) => {
    const snagLabel = issue.snagNumber ? `#${issue.snagNumber}` : `${idx + 1}`;
    const before = issue.images.filter((i) => i.role === 'before');
    const after = issue.images.filter((i) => i.role === 'after');
    const evidence = issue.images.filter((i) => !i.role || i.role === 'evidence' || i.role === 'context');

    const photoHtml = (imgs: IssueImage[]) =>
      imgs
        .map((img) => {
          const src = resolveUri(img.annotatedUri || img.uri, embeds);
          if (!src) return '';
          const meta: string[] = [];
          if (img.caption) meta.push(img.caption);
          if (img.role && img.role !== 'evidence') meta.push(img.role);
          if (settings.reportShowTimestamps) meta.push(new Date(img.capturedAt).toLocaleString());
          if (settings.reportShowGps && img.lat != null && img.lon != null) {
            meta.push(`${img.lat.toFixed(5)}, ${img.lon.toFixed(5)}`);
          }
          return `<div class="photo">
            <img src="${src}" />
            ${meta.length ? `<div class="meta">${esc(meta.join(' · '))}</div>` : ''}
          </div>`;
        })
        .join('');

    const priorityBadge = issue.priority
      ? `<span class="badge prio">${esc(issue.priority)}</span>`
      : '';
    const statusBadge = `<span class="badge ${issue.completed || issue.status === 'closed' ? 'done' : 'open'}">${esc(
      issue.status || (issue.completed ? 'closed' : 'open')
    )}</span>`;

    return `<section class="issue">
      <div class="issue-head">
        <div class="num">${esc(String(snagLabel))}</div>
        <div>
          <h3>${esc(issue.title || `${wording.issueSingular} ${snagLabel}`)}</h3>
          <div class="sub">
            ${issue.location ? `<span>${esc(issue.location)}</span>` : ''}
            ${issue.trade ? `<span>${esc(issue.trade)}</span>` : ''}
            ${issue.assignee ? `<span>Assignee: ${esc(issue.assignee)}</span>` : ''}
            ${issue.dueDate ? `<span>Due: ${esc(new Date(issue.dueDate).toLocaleDateString())}</span>` : ''}
            ${priorityBadge}
            ${statusBadge}
          </div>
        </div>
      </div>
      ${issue.comments ? `<p class="comments">${esc(issue.comments)}</p>` : ''}
      ${issue.remedialNotes ? `<p class="comments"><strong>Remedial:</strong> ${esc(issue.remedialNotes)}</p>` : ''}
      ${before.length || after.length
        ? `<div class="ba"><div><h4>Before</h4><div class="photos">${photoHtml(before)}</div></div><div><h4>After</h4><div class="photos">${photoHtml(after)}</div></div></div>`
        : ''}
      <div class="photos">${photoHtml(evidence)}</div>
    </section>`;
  };

  let bodyIssues = '';
  const groupBy = opts.groupBy || 'none';
  if (groupBy === 'none') {
    bodyIssues = issueList.map((issue, idx) => renderIssue(issue, idx)).join('');
  } else {
    const groups = new Map<string, ReportIssue[]>();
    for (const issue of issueList) {
      const key =
        groupBy === 'location'
          ? issue.location || 'Unspecified location'
          : groupBy === 'trade'
            ? issue.trade || 'Unspecified trade'
            : issue.priority || 'Unspecified priority';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(issue);
    }
    let n = 0;
    for (const [label, list] of groups) {
      bodyIssues += `<div class="section"><h2>${esc(label)}</h2></div>`;
      bodyIssues += list.map((issue) => renderIssue(issue, n++)).join('');
    }
  }

  const coverSrc = resolveUri(project.coverUri, embeds);
  const logoSrc = resolveUri(settings.logoUri, embeds);
  const sigSrc = resolveUri(settings.signatureUri, embeds);
  const clientSigSrc = resolveUri(project.clientSignatureUri, embeds);

  const pageFooter = settings.reportShowPageNumbers
    ? `@bottom-center { content: "Page " counter(page) " of " counter(pages); font-size: 10px; color: ${theme.muted}; }`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 18mm 14mm; ${pageFooter} }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: ${theme.text}; background: #fff; margin: 0; }
  .cover { background: ${theme.headerBg}; color: #fff; padding: 36px 28px; border-radius: 12px; margin-bottom: 24px; position: relative; }
  .cover h1 { margin: 0 0 8px; font-size: 28px; }
  .cover .ref { opacity: 0.85; margin-bottom: 16px; }
  .cover-logo { position: absolute; top: 24px; right: 24px; max-height: 48px; }
  .cover-photo { width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin-top: 16px; }
  .grid { display: flex; gap: 24px; flex-wrap: wrap; }
  .grid div { min-width: 160px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.7; }
  .value { font-size: 14px; margin-top: 2px; }
  .counts { margin-top: 18px; display: flex; gap: 12px; flex-wrap: wrap; }
  .pill { background: ${accent}; color: #fff; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .section { margin: 18px 0; padding: 14px; background: ${theme.surface}; border: 1px solid ${theme.border}; border-radius: 10px; }
  .section h2 { margin: 0 0 8px; font-size: 16px; color: ${accent}; }
  .issue { border: 1px solid ${theme.border}; border-radius: 10px; padding: 14px; margin: 14px 0; page-break-inside: avoid; }
  .issue-head { display: flex; gap: 12px; align-items: flex-start; }
  .num { min-width: 36px; height: 28px; padding: 0 8px; border-radius: 8px; background: ${accent}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
  h3 { margin: 0; font-size: 16px; }
  h4 { margin: 8px 0 4px; font-size: 12px; color: ${theme.muted}; }
  .sub { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; color: ${theme.muted}; font-size: 12px; }
  .badge { padding: 2px 8px; border-radius: 999px; font-weight: 700; text-transform: capitalize; }
  .badge.done { background: #D1FAE5; color: #065F46; }
  .badge.open { background: #FFEDD5; color: #9A3412; }
  .badge.prio { background: #FEE2E2; color: #991B1B; }
  .comments { white-space: pre-wrap; line-height: 1.45; }
  .photos { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
  .photo { width: 48%; }
  .photo img { width: 100%; border-radius: 8px; border: 1px solid ${theme.border}; }
  .meta { font-size: 10px; color: ${theme.muted}; margin-top: 4px; }
  .ba { display: flex; gap: 12px; }
  .ba > div { flex: 1; }
  .sig { margin-top: 28px; display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
  .sig img { max-height: 64px; }
  .qr { margin-top: 16px; }
  .footer { margin-top: 24px; font-size: 11px; color: ${theme.muted}; border-top: 1px solid ${theme.border}; padding-top: 10px; }
  .promo {
    margin-top: 28px;
    padding: 18px 16px;
    border: 1px solid ${theme.border};
    border-radius: 12px;
    background: ${theme.surface};
    page-break-inside: avoid;
  }
  .promo-inner { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .promo-logo {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    object-fit: contain;
    background: #fff;
    border: 1px solid ${theme.border};
  }
  .promo-copy { flex: 1; min-width: 160px; }
  .promo-copy h2 { margin: 0 0 4px; font-size: 18px; color: ${theme.text}; }
  .promo-copy p { margin: 0; color: ${theme.muted}; font-size: 12px; line-height: 1.4; }
  .promo-cta { margin-top: 8px !important; color: ${accent} !important; font-weight: 700; font-size: 13px !important; }
  .promo-qr { flex-shrink: 0; }
  .promo-qr svg { width: 112px; height: 112px; display: block; border: 1px solid ${theme.border}; border-radius: 8px; background: #fff; }
  .promo-url { margin-top: 10px; font-size: 10px; color: ${theme.muted}; word-break: break-all; }
</style>
</head>
<body>
  <div class="cover">
    ${logoSrc ? `<img class="cover-logo" src="${logoSrc}" />` : ''}
    <h1>${esc(project.title)}</h1>
    <div class="ref">${[
      project.reference,
      project.area,
      project.plotNumber ? `Plot ${project.plotNumber}` : '',
      project.inspectionDate ? new Date(project.inspectionDate).toLocaleDateString() : '',
    ]
      .filter(Boolean)
      .map((x) => esc(String(x)))
      .join(' · ')}</div>
    <div class="grid">
      <div><div class="label">${esc(wording.preparedFor)}</div><div class="value">${esc(project.client || '—')}</div></div>
      <div><div class="label">Site</div><div class="value">${esc(project.address || '—')}</div></div>
      <div><div class="label">Area</div><div class="value">${esc(project.area || '—')}</div></div>
      <div><div class="label">Plot</div><div class="value">${esc(project.plotNumber || '—')}</div></div>
      <div><div class="label">Company</div><div class="value">${esc(settings.companyName || '—')}</div></div>
      <div><div class="label">${esc(wording.auditorLabel)}</div><div class="value">${esc(settings.auditorName || '—')}</div></div>
    </div>
    ${
      settings.reportShowCounts
        ? `<div class="counts">
            <div class="pill">${esc(wording.identifiedPhrase)} ${total} ${esc(total === 1 ? wording.issueSingular : wording.issuePlural)}</div>
            <div class="pill">${esc(wording.incompletePhrase)} ${incomplete}</div>
          </div>`
        : ''
    }
    ${coverSrc ? `<img class="cover-photo" src="${coverSrc}" />` : ''}
    ${opts.qrSvg ? `<div class="qr">${opts.qrSvg}</div>` : ''}
  </div>

  ${
    settings.reportShowIntro && project.intro
      ? `<div class="section"><h2>Introduction</h2><p>${esc(project.intro)}</p></div>`
      : ''
  }
  ${
    settings.reportShowSummary && project.summary
      ? `<div class="section"><h2>Summary</h2><p>${esc(project.summary)}</p></div>`
      : ''
  }

  ${bodyIssues}

  <div class="sig">
    <div>
      <div class="label">${esc(wording.auditorLabel)}</div>
      <div class="value">${esc(settings.auditorName || '')}</div>
      ${sigSrc ? `<img src="${sigSrc}" />` : ''}
    </div>
    <div>
      <div class="label">Company</div>
      <div class="value">${esc(settings.companyName || '')}</div>
      ${logoSrc ? `<img src="${logoSrc}" style="max-height:48px" />` : ''}
    </div>
    ${
      clientSigSrc || project.clientSignedAt
        ? `<div>
            <div class="label">Client sign-off</div>
            <div class="value">${project.clientSignedAt ? esc(new Date(project.clientSignedAt).toLocaleString()) : ''}</div>
            ${clientSigSrc ? `<img src="${clientSigSrc}" />` : ''}
          </div>`
        : ''
    }
  </div>
  ${
    opts.appPromo
      ? `<div class="promo">
          <div class="promo-inner">
            ${
              opts.appPromo.logoDataUri
                ? `<img class="promo-logo" src="${opts.appPromo.logoDataUri}" alt="Site Audit Max" />`
                : ''
            }
            <div class="promo-copy">
              <h2>Site Audit Max</h2>
              <p>Snag more work. Audit with confidence — fully offline site inspections on Android.</p>
              <p class="promo-cta">Scan the QR code to get the app on Google Play</p>
            </div>
            <div class="promo-qr">${opts.appPromo.qrSvg}</div>
          </div>
          <div class="promo-url">${esc(opts.appPromo.playStoreUrl)}</div>
        </div>`
      : ''
  }
  <div class="footer">Generated offline by Site Audit Max · ${esc(new Date().toLocaleString())}</div>
</body>
</html>`;
}

export function buildCsv(opts: {
  project: Project;
  issues: ReportIssue[];
  wording: WordingConfig;
}): string {
  const header = [
    'Project',
    'Area',
    'Plot',
    'ProjectNotes',
    'Category',
    'SnagNumber',
    'Title',
    'Assignee',
    'Location',
    'Trade',
    'Priority',
    'Status',
    'Comments',
    'Remedial',
    'Due Date',
    'Image Count',
    'GPS',
  ];
  const lines = [header.join(',')];
  opts.issues.forEach((issue) => {
    const gps = issue.images
      .filter((i) => i.lat != null)
      .map((i) => `${i.lat},${i.lon}`)
      .join('; ');
    const row = [
      csvCell(opts.project.title),
      csvCell(opts.project.area || ''),
      csvCell(opts.project.plotNumber || ''),
      csvCell(opts.project.notes || ''),
      csvCell(issue.category || ''),
      issue.snagNumber ?? '',
      csvCell(issue.title),
      csvCell(issue.assignee),
      csvCell(issue.location || ''),
      csvCell(issue.trade || ''),
      csvCell(issue.priority || ''),
      csvCell(issue.status || (issue.completed ? 'closed' : 'open')),
      csvCell(issue.comments),
      csvCell(issue.remedialNotes || ''),
      issue.dueDate ? csvCell(new Date(issue.dueDate).toISOString().slice(0, 10)) : '',
      issue.images.length,
      csvCell(gps),
    ];
    lines.push(row.join(','));
  });
  return '\uFEFF' + lines.join('\n');
}

function csvCell(v: string | number) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Minimal QR-like visual + text payload (offline, no dependency). */
export function buildQrSvg(payload: string): string {
  const text = esc(payload.slice(0, 120));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140" viewBox="0 0 120 140">
    <rect width="120" height="120" fill="#fff" stroke="#111" stroke-width="2"/>
    <rect x="8" y="8" width="28" height="28" fill="#111"/>
    <rect x="84" y="8" width="28" height="28" fill="#111"/>
    <rect x="8" y="84" width="28" height="28" fill="#111"/>
    <rect x="44" y="44" width="32" height="32" fill="#111"/>
    <text x="60" y="136" text-anchor="middle" font-size="7" fill="#333">${text}</text>
  </svg>`;
}
