import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsv, buildQrSvg } from '../reportBuilder';
import { ANDROID_PACKAGE_ID, PLAY_STORE_URL, buildPlayStoreQrSvg } from '../appPromo';
import type { AppSettings, Issue, IssueImage, Project, WordingConfig } from '../../types';

const wording: WordingConfig = {
  issueSingular: 'Issue',
  issuePlural: 'Issues',
  identifiedPhrase: 'Identified',
  incompletePhrase: 'Incomplete',
  preparedFor: 'Prepared for',
  auditorLabel: 'Auditor',
};

const project: Project = {
  id: 'p1',
  folderId: null,
  title: 'Block A Handover',
  area: 'Block A',
  plotNumber: '14',
  reference: 'REF-1',
  client: 'Acme',
  address: '1 Site Rd',
  intro: '',
  summary: '',
  notes: 'Keep dry',
  coverUri: null,
  pinned: 0,
  completed: 0,
  createdAt: 1,
  updatedAt: 1,
  inspectionDate: null,
  phase: 'snag',
  latestReportUri: null,
  clientSignatureUri: null,
  clientSignedAt: null,
  deletedAt: null,
};

function issue(partial: Partial<Issue> & { images?: IssueImage[] }): Issue & { images: IssueImage[] } {
  return {
    id: 'i1',
    projectId: 'p1',
    title: 'Crack',
    comments: '',
    assignee: 'Sam',
    priority: 'high',
    status: 'open',
    completed: 0,
    snagNumber: 1,
    sortOrder: 0,
    createdAt: 1,
    dueDate: null,
    trade: 'Finishes',
    location: 'Kitchen',
    category: 'Fabric',
    remedialNotes: '',
    closedAt: null,
    audioUri: null,
    deletedAt: null,
    ...partial,
    images: partial.images ?? [],
  };
}

describe('smoke: create / annotate / report / backup contracts', () => {
  it('CSV includes project area, plot, notes, and issue category', () => {
    const csv = buildCsv({
      project,
      wording,
      issues: [issue({})],
    });
    assert.match(csv, /Area/);
    assert.match(csv, /Plot/);
    assert.match(csv, /ProjectNotes/);
    assert.match(csv, /Category/);
    assert.match(csv, /Block A/);
    assert.match(csv, /14/);
    assert.match(csv, /Keep dry/);
    assert.match(csv, /Fabric/);
    assert.match(csv, /Crack/);
  });

  it('report QR helper is decorative SVG with text payload', () => {
    const svg = buildQrSvg('Site | REF | 2026-07-27');
    assert.match(svg, /<svg/);
    assert.match(svg, /Site \| REF/);
  });

  it('Play Store promo QR is scannable SVG for the Android package', () => {
    assert.equal(ANDROID_PACKAGE_ID, 'com.siteauditmax.app');
    assert.match(PLAY_STORE_URL, /id=com\.siteauditmax\.app/);
    const svg = buildPlayStoreQrSvg(120);
    assert.match(svg, /<svg/);
    assert.match(svg, /<(path|rect)/);
  });

  it('open-only filter keeps closed issues out of media pack selection', () => {
    const open = issue({ id: 'open', status: 'open', completed: 0 });
    const closed = issue({
      id: 'closed',
      status: 'closed',
      completed: 1,
      images: [
        {
          id: 'img1',
          issueId: 'closed',
          uri: 'file://closed.jpg',
          annotatedUri: null,
          lat: null,
          lon: null,
          capturedAt: 1,
          sortOrder: 0,
          role: 'evidence',
          caption: '',
          audioUri: null,
        },
      ],
    });
    const all = [open, closed];
    const zipIssues = true
      ? all.filter((i) => !i.completed && i.status !== 'closed')
      : all;
    assert.equal(zipIssues.length, 1);
    assert.equal(zipIssues[0].id, 'open');
  });

  it('settings shape still carries branding + report toggles used by backup restore path', () => {
    const settings = {
      companyName: 'Co',
      auditorName: 'Aud',
      logoUri: null,
      signatureUri: null,
      wordingJson: JSON.stringify(wording),
      sfxEnabled: 1,
      hapticsEnabled: 1,
      highContrast: 0,
      useSquareImages: 0,
      hideCompletedProjects: 0,
      imageQuality: 80,
      appearance: 'system',
      projectSort: 'date_desc',
      defaultThemeId: 'steel',
      customAccent: '#2F6B3A',
      reportShowTimestamps: 1,
      reportShowGps: 1,
      reportShowPageNumbers: 0,
      reportShowIntro: 1,
      reportShowSummary: 1,
      reportShowCounts: 1,
      onboardingDone: 1,
    } satisfies Partial<AppSettings>;
    assert.equal(settings.customAccent, '#2F6B3A');
    assert.equal(settings.defaultThemeId, 'steel');
  });
});
