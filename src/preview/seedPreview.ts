import {
  createFolder,
  createIssue,
  createProject,
  deleteProject,
  listFolders,
  listProjects,
  listIssues,
  updateSettings,
} from '@/src/db/repository';
import type { IssuePriority, IssueStatus } from '@/src/types';

/**
 * Demo data for simulator screenshot capture.
 *
 * Used by the `iOS Simulator Preview` workflow to give the app populated
 * screens when it is photographed for the App Store. Every project created here
 * uses a `PREVIEW-` reference, so seeding is idempotent and can be undone with
 * clearPreviewData(). Nothing here runs in a release build.
 */

const PREVIEW_PREFIX = 'PREVIEW-';
const DAY = 86_400_000;

type SeedIssue = {
  title: string;
  trade: string;
  location: string;
  priority: IssuePriority;
  status: IssueStatus;
  assignee: string;
  comments: string;
  dueInDays?: number;
};

type SeedProject = {
  title: string;
  reference: string;
  client: string;
  address: string;
  area: string;
  plotNumber: string;
  phase: string;
  intro: string;
  summary: string;
  inspectionDaysAgo: number;
  folder?: string;
  issues: SeedIssue[];
};

const SEED_FOLDERS: { title: string; color: string }[] = [
  { title: 'Residential', color: '#2F6B3A' },
  { title: 'Commercial', color: '#2F5D8C' },
];

const SEED_PROJECTS: SeedProject[] = [
  {
    title: 'Meadow Court — Handover Inspection',
    reference: 'PREVIEW-001',
    client: 'Harwell Developments Ltd',
    address: 'Meadow Court, Plymouth PL4 6RN',
    area: 'Ground & first floor, plots 1–8',
    plotNumber: 'Plots 1–8',
    phase: 'Handover',
    intro: 'Handover inspection ahead of client walk-through and key release.',
    summary: 'Eight plots surveyed. Defects logged against decoration, joinery and drainage.',
    inspectionDaysAgo: 2,
    folder: 'Residential',
    issues: [
      {
        title: 'Bedroom 2 window frame not sealed to reveal',
        trade: 'Windows',
        location: 'Plot 3, bedroom 2',
        priority: 'high',
        status: 'open',
        assignee: 'K. Doyle',
        comments: 'External mastic missing along the head and both jambs. Water tracking risk.',
        dueInDays: 3,
      },
      {
        title: 'Kitchen unit door catches on adjacent carcass',
        trade: 'Joinery',
        location: 'Plot 1, kitchen',
        priority: 'medium',
        status: 'in_progress',
        assignee: 'P. Nowak',
        comments: 'Left-hand wall unit door fouls the extract hood housing.',
        dueInDays: 6,
      },
      {
        title: 'External drain cover proud of paving',
        trade: 'Groundworks',
        location: 'Rear garden, Plot 6',
        priority: 'critical',
        status: 'open',
        assignee: 'Site team',
        comments: 'Trip hazard at 40mm above finished level. Barrier in place pending reset.',
        dueInDays: 1,
      },
      {
        title: 'Boiler flue terminal within 300mm of opening light',
        trade: 'Heating',
        location: 'Plot 5, side elevation',
        priority: 'critical',
        status: 'ready_for_reinspect',
        assignee: 'G. Whitlock',
        comments: 'Flue re-sited on 09/10. Re-inspection booked with Gas Safe cert supplied.',
        dueInDays: -1,
      },
      {
        title: 'En-suite extract fan running below design rate',
        trade: 'Electrical',
        location: 'Plot 7, en-suite',
        priority: 'medium',
        status: 'open',
        assignee: 'R. Ellery',
        comments: 'Measured 6 l/s against 15 l/s design. Duct likely crushed at ceiling void.',
        dueInDays: 8,
      },
      {
        title: 'Sill paint finish thin with visible brush marks',
        trade: 'Decorating',
        location: 'Plots 2 & 4, stairs',
        priority: 'low',
        status: 'in_progress',
        assignee: 'Decor team',
        comments: 'Second coat required to all stair sills before handover.',
        dueInDays: 10,
      },
      {
        title: 'Fence panel loose adjacent to parking bay 4',
        trade: 'External works',
        location: 'Parking court',
        priority: 'medium',
        status: 'closed',
        assignee: 'Site team',
        comments: 'Post re-bedded and panel refixed. Verified on site 11/10.',
      },
      {
        title: 'Air test certificate not yet issued to client',
        trade: 'Compliance',
        location: 'Documentation',
        priority: 'high',
        status: 'closed',
        assignee: 'J. Marsh',
        comments: 'Certificate received and filed against the handover pack.',
      },
    ],
  },
  {
    title: 'Kingsway Retail Unit — Snagging',
    reference: 'PREVIEW-002',
    client: 'Kingsway Estates',
    address: 'Unit 12, Kingsway Retail Park, Plymouth PL7 1AB',
    area: 'Unit 12 — sales floor and back of house',
    plotNumber: 'Unit 12',
    phase: 'Snagging',
    intro: 'End-of-fit-out snagging survey for landlord handover.',
    summary: 'Shopfront, M&E and floor finishes reviewed. Six items raised for contractor.',
    inspectionDaysAgo: 9,
    folder: 'Commercial',
    issues: [
      {
        title: 'Automatic door hold-open time below 20 seconds',
        trade: 'Doors',
        location: 'Main entrance',
        priority: 'high',
        status: 'open',
        assignee: 'M. Ahmed',
        comments: 'Door closes in 11s and catches the foot traffic. Adjust closer and retest.',
        dueInDays: 2,
      },
      {
        title: 'Paint splash on glazed shopfront unit 3',
        trade: 'Decorating',
        location: 'Shopfront, glazing bay 3',
        priority: 'low',
        status: 'in_progress',
        assignee: 'Decor team',
        comments: 'Emulsion over-spray to be removed with a non-abrasive polish.',
        dueInDays: 5,
      },
      {
        title: 'Suspended ceiling tile grid misaligned at threshold',
        trade: 'Ceilings',
        location: 'Back of house corridor',
        priority: 'medium',
        status: 'open',
        assignee: 'Fit-out contractor',
        comments: 'Grid cut short by 15mm leaving an open edge above the fire door.',
        dueInDays: 7,
      },
      {
        title: 'Emergency lighting test log incomplete',
        trade: 'Compliance',
        location: 'Electrical cupboard',
        priority: 'high',
        status: 'ready_for_reinspect',
        assignee: 'R. Ellery',
        comments: 'Full 3-hour drain-down test now recorded and witnessed.',
        dueInDays: -3,
      },
      {
        title: 'Vinyl floor joint lifted at till point',
        trade: 'Flooring',
        location: 'Sales floor, till 2',
        priority: 'medium',
        status: 'open',
        assignee: 'Flooring contractor',
        comments: 'Heat-welded joint has debonded for approx. 400mm.',
        dueInDays: 6,
      },
      {
        title: 'Accessible WC alarm pull cord tied up',
        trade: 'Compliance',
        location: 'Accessible WC',
        priority: 'critical',
        status: 'closed',
        assignee: 'M. Ahmed',
        comments: 'Cord released and drop height checked. Signage added.',
      },
    ],
  },
  {
    title: 'Ashcombe House — Stage 1 Audit',
    reference: 'PREVIEW-003',
    client: 'Ashcombe Trust',
    address: 'Ashcombe House, Exeter EX2 8QT',
    area: 'Full building — Stage 1',
    plotNumber: '—',
    phase: 'Stage 1',
    intro: 'Stage 1 condition audit for landlord dilapidations assessment.',
    summary: 'Roof, facade and plant rooms audited. Dilapidations schedule drafted.',
    inspectionDaysAgo: 21,
    folder: 'Commercial',
    issues: [
      {
        title: 'Flat roof covering blistered over plant room',
        trade: 'Roofing',
        location: 'Roof, plant room quadrant',
        priority: 'critical',
        status: 'in_progress',
        assignee: 'Roofing contractor',
        comments: 'Two blisters over 1m². Core sample taken; insulation shows signs of moisture.',
        dueInDays: 4,
      },
      {
        title: 'Rainwater downpipe leaking at first-floor bracket',
        trade: 'Roofing',
        location: 'North elevation',
        priority: 'high',
        status: 'open',
        assignee: 'Roofing contractor',
        comments: 'Joint pulled apart and discharging onto the render. Staining to the reveal.',
        dueInDays: 5,
      },
      {
        title: 'AHU filters overdue against service schedule',
        trade: 'Mechanical',
        location: 'Roof, plant room',
        priority: 'medium',
        status: 'open',
        assignee: 'M&E contractor',
        comments: 'Filter differential pressure at 240Pa. Replace and update the log.',
        dueInDays: 9,
      },
      {
        title: 'Damp staining to second-floor ceiling void',
        trade: 'General',
        location: 'Second floor, office 2.04',
        priority: 'high',
        status: 'disputed',
        assignee: 'J. Marsh',
        comments: 'Tenant disputes cause. Awaiting independent hygrometer readings.',
        dueInDays: 12,
      },
      {
        title: 'Fire door intumescent strip missing to store door',
        trade: 'Compliance',
        location: 'Ground floor store',
        priority: 'critical',
        status: 'closed',
        assignee: 'K. Doyle',
        comments: 'Strip and closer fitted. Certification received.',
      },
    ],
  },
];

/** Remove every project created by a previous seed run. */
export async function clearPreviewData(): Promise<void> {
  const projects = await listProjects();
  for (const p of projects) {
    if (p.reference.startsWith(PREVIEW_PREFIX)) {
      await deleteProject(p.id);
    }
  }
}

export type PreviewTargets = {
  /** Project with the richest set of snags — the one to photograph. */
  projectId: string;
  issueId: string;
  closedProjectId: string;
};

export async function seedPreviewData(): Promise<PreviewTargets> {
  await clearPreviewData();

  const existingFolders = await listFolders();
  const folderIdByTitle = new Map(existingFolders.map((f) => [f.title, f.id]));
  for (const seed of SEED_FOLDERS) {
    if (!folderIdByTitle.has(seed.title)) {
      const created = await createFolder(seed.title, seed.color);
      folderIdByTitle.set(created.title, created.id);
    }
  }

  let firstProjectId = '';
  let firstIssueId = '';
  let closedProjectId = '';

  for (const seed of SEED_PROJECTS) {
    const project = await createProject({
      title: seed.title,
      reference: seed.reference,
      client: seed.client,
      address: seed.address,
      area: seed.area,
      plotNumber: seed.plotNumber,
      phase: seed.phase,
      intro: seed.intro,
      summary: seed.summary,
      folderId: seed.folder ? (folderIdByTitle.get(seed.folder) ?? null) : null,
      inspectionDate: Date.now() - seed.inspectionDaysAgo * DAY,
    });

    for (const issue of seed.issues) {
      const created = await createIssue(project.id, {
        title: issue.title,
        trade: issue.trade,
        location: issue.location,
        priority: issue.priority,
        status: issue.status,
        assignee: issue.assignee,
        comments: issue.comments,
        dueDate: issue.dueInDays === undefined ? null : Date.now() + issue.dueInDays * DAY,
      });
      if (!firstIssueId) firstIssueId = created.id;
    }

    if (!firstProjectId) firstProjectId = project.id;
    if (!closedProjectId) {
      const issues = await listIssues(project.id);
      if (issues.some((i) => i.status === 'closed')) closedProjectId = project.id;
    }
  }

  await updateSettings({
    onboardingDone: 1,
    companyName: 'Northgate Building Consultancy',
    auditorName: 'J. Marsh',
    projectSort: 'date_desc',
  });

  return { projectId: firstProjectId, issueId: firstIssueId, closedProjectId };
}
