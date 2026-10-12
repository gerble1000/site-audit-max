import type { Href } from 'expo-router';

export type HelpTopic = {
  id: string;
  title: string;
  body: string;
  cta: string;
  href: Href;
  bullets?: string[];
};

/** First competitor “getting started” list */
export const HELP_BASICS: HelpTopic[] = [
  {
    id: 'offline',
    title: 'Offline Projects',
    body: 'Everything stays on this device. Create projects, capture snags, annotate photos, and build reports with no account and no internet. Share a PDF, CSV, or ZIP when you are ready — into Drive, Dropbox, email, or Files.',
    cta: 'Go to Projects',
    href: '/' as Href,
  },
  {
    id: 'project-info',
    title: 'Basic Project Information',
    body: 'Each project has a name plus optional Area, Plot number, and Phase. You can also set inspection date, client, site address, reference, introduction, summary, and notes. Tap + to create a project, or open a project and tap Edit.',
    cta: 'Create a project',
    href: '/' as Href,
    bullets: [
      'Project name (required)',
      'Area, plot, and phase (optional)',
      'Inspection date',
      'Client, site address, reference',
      'Introduction, summary, notes, cover photo',
    ],
  },
  {
    id: 'issue-details',
    title: 'Basic Issue Details',
    body: 'Issues (snags) support title, assignee, location, trade, category, priority, status, due date, remedial notes, voice notes, and multiple photos with evidence / before / after / context roles.',
    cta: 'Back to Projects',
    href: '/' as Href,
    bullets: [
      'Title, snag number, assignee',
      'Location, trade, category',
      'Priority and status',
      'Due date and remedial notes',
      'Photos + captions + voice notes',
    ],
  },
  {
    id: 'annotate',
    title: 'Annotate Images',
    body: 'Open any photo and mark it up with pen, arrow, text, or stamp. More tools include highlight, shapes, whiteout, and a solid mask (not a photographic blur). Tap Save — drawings are baked into the photo for reports and reopen.',
    cta: 'Back to Projects',
    href: '/' as Href,
    bullets: [
      'Primary: Pen, Arrow, Text, Stamp',
      'More: Highlight, Line, Box, Circle, Mask, Whiteout',
      'Mask covers an area; Whiteout paints white',
      'Always tap Save to keep markup',
    ],
  },
  {
    id: 'signature',
    title: 'Add a Signature to your Projects',
    body: 'Draw your auditor signature once in Settings — it appears on reports. You can also capture a client signature on each project from Edit project.',
    cta: 'Open Settings',
    href: '/(tabs)/settings' as Href,
  },
  {
    id: 'report-themes',
    title: 'Default Report Themes',
    body: 'Choose a default report look (Steel, Blueprint, Site Walk, and more). New exports start on that theme. You can still change theme per report before sharing.',
    cta: 'Choose default theme',
    href: '/(tabs)/settings' as Href,
    bullets: [
      'Steel, Blueprint, Site Walk, Ledger',
      'Safety, Slate, Timber, Concrete',
      'Set a default in Settings',
      'Override per report when exporting',
    ],
  },
];

/** Second competitor feature list */
export const HELP_MORE: HelpTopic[] = [
  {
    id: 'folders',
    title: 'Folders to organise Projects',
    body: 'Use the Folders tab to group projects by site, client, or phase. Colour-code folders, then filter the Projects list by folder chips — or leave projects Unfiled.',
    cta: 'Open Folders',
    href: '/(tabs)/folders' as Href,
    bullets: [
      'Create folders with a colour',
      'Assign a project to a folder when editing',
      'Filter Projects by folder',
      'Unfiled for jobs with no folder',
    ],
  },
  {
    id: 'extra-project-info',
    title: 'Additional Project Information',
    body: 'Beyond name, area and plot, projects store phase, inspection date, client, site address, reference, introduction, summary, notes, cover photo, and client signature for PDF reports. Floor-plan pins live in the Floor plan screen for on-site navigation — they are not drawn onto the PDF.',
    cta: 'Go to Projects',
    href: '/' as Href,
    bullets: [
      'Phase and inspection date',
      'Client & site address',
      'Reference, intro & summary',
      'Notes and cover photo',
      'Floor-plan pins (in-app only)',
      'Client signature on reports',
    ],
  },
  {
    id: 'multi-photos',
    title: 'Multiple Photos per Issue',
    body: 'Each issue can hold many photos. Add from camera or gallery, set roles (evidence, before, after, context), captions, reorder, and annotate each one. All photos appear in the report.',
    cta: 'Back to Projects',
    href: '/' as Href,
    bullets: [
      'Camera or gallery (multi-select)',
      'Evidence / before / after / context roles',
      'Captions and annotate per photo',
      'Reorder or delete with a long-press',
    ],
  },
  {
    id: 'due-dates',
    title: 'Issue Due Dates',
    body: 'Set a due date on any issue (Today, +3, +7, or clear). Overdue items highlight on the project list. Use Select mode to set due dates on many issues at once.',
    cta: 'Back to Projects',
    href: '/' as Href,
    bullets: [
      'Set due on the issue screen',
      'Overdue shown in red on the list',
      'Bulk Due +7 in Select mode',
    ],
  },
  {
    id: 'complete-issues',
    title: 'Mark Issues as Completed',
    body: 'Tap the circle on a project row or mark status Closed on the issue. Completed issues can be hidden with Filters. Select mode can complete or reopen many snags together.',
    cta: 'Back to Projects',
    href: '/' as Href,
    bullets: [
      'Tap the check circle on a project row',
      'Or set status to Closed on the issue',
      'Hide completed via Filters',
      'Bulk complete / reopen in Select mode',
    ],
  },
  {
    id: 'extra-themes',
    title: 'Additional Report Themes',
    body: 'Eight built-in report looks: Steel, Blueprint, Site Walk, Ledger, Safety, Slate, Timber, and Concrete. Pick a default in Settings, or change theme when exporting a report. PDF exports can end with a Site Audit Max promo and a scannable Google Play QR. The optional cover reference strip is decorative only.',
    cta: 'Choose themes',
    href: '/(tabs)/settings' as Href,
    bullets: [
      'Eight professional themes',
      'Default theme in Settings',
      'Per-report override on export',
      'End-of-report Play Store QR promo',
      'Decorative cover reference strip (optional)',
    ],
  },
  {
    id: 'theme-colours',
    title: 'Customise Report Theme Colours',
    body: 'In Settings, set a Report accent colour (presets or your own hex). It tints report accents to match your brand alongside the chosen theme.',
    cta: 'Customise colours',
    href: '/(tabs)/settings' as Href,
    bullets: [
      'Preset accent swatches',
      'Or enter a hex colour',
      'Works with any report theme',
    ],
  },
];

export const HELP_SECTIONS: { label: string; topics: HelpTopic[] }[] = [
  { label: 'GETTING STARTED', topics: HELP_BASICS },
  { label: 'MORE FEATURES', topics: HELP_MORE },
];

export const HELP_TOPICS: HelpTopic[] = [...HELP_BASICS, ...HELP_MORE];

export type HelpTopicId = (typeof HELP_TOPICS)[number]['id'];
