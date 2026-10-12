import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  TextInput,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { Button, Card, contentWidth, EmptyState, Muted, Screen, Title, Chip } from '@/src/components/ui';
import { PromptModal, ConfirmModal } from '@/src/components/modals/PromptModal';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useAppStore } from '@/src/store/useAppStore';
import * as repo from '@/src/db/repository';
import { pickImages, cacheBustUri } from '@/src/services/media';
import { playSfx } from '@/src/services/sfx';
import type { Issue, IssuePriority, IssueStatus, Project } from '@/src/types';
import { PRIORITIES, STATUSES } from '@/src/types';
import { spacing } from '@/src/theme/tokens';
import { addDays, startOfDay } from 'date-fns';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const wording = useAppStore((s) => s.wording);
  const settings = useAppStore((s) => s.settings);
  const dataEpoch = useAppStore((s) => s.dataEpoch);
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState({ total: 0, incomplete: 0, completed: 0 });
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hideUnassigned, setHideUnassigned] = useState(false);
  const [newestFirst, setNewestFirst] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | undefined>();
  const [templates, setTemplates] = useState<{ id: string; title: string; itemCount: number }[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [templatePickId, setTemplatePickId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    const p = await repo.getProject(id);
    setProject(p);
    const list = await repo.listIssues(id, {
      hideCompleted,
      hideUnassigned,
      newestFirst,
      search,
      status: statusFilter,
      priority: priorityFilter,
    });
    setIssues(list);
    setCounts(await repo.getIssueCounts(id));
    setTemplates(await repo.listTemplates());
    setThumbs(await repo.listFirstImageUriByIssueIds(list.map((i) => i.id)));
  }, [id, hideCompleted, hideUnassigned, newestFirst, search, statusFilter, priorityFilter]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload, dataEpoch])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: project?.title ?? 'Project',
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12, marginRight: 4 }}>
          <Pressable onPress={() => setSelectMode((v) => !v)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: c.headerText, fontWeight: '700' }}>{selectMode ? 'Done' : 'Select'}</Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/project-edit/${id}`)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: c.headerText, fontWeight: '700' }}>Edit</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, project, id, router, c, selectMode]);

  const addIssue = async () => {
    if (!id) return;
    const issue = await repo.createIssue(id);
    playSfx('add');
    router.push(`/issue/${issue.id}`);
  };

  const addFromLibrary = async () => {
    if (!id || !settings) return;
    const assets = await pickImages({
      projectId: id,
      quality: settings.imageQuality,
      square: !!settings.useSquareImages,
      allowsMultiple: true,
    });
    const valid = assets.filter((a) => a.uri && !a.denied && !a.canceled);
    for (const asset of valid) {
      const issue = await repo.createIssue(id, { title: '' });
      await repo.addImage(issue.id, asset);
    }
    if (valid.length) {
      playSfx('capture');
      await reload();
      if (valid.length > 1) {
        Alert.alert('Photos added', `${valid.length} snags created. Open each to title or annotate.`);
      }
    }
  };

  const toggleSelect = (issueId: string) => {
    setSelected((s) => (s.includes(issueId) ? s.filter((x) => x !== issueId) : [...s, issueId]));
  };

  if (!project) {
    return (
      <Screen>
        <EmptyState title="Missing project" body="This project was deleted." />
        <Button label="Back to projects" onPress={() => router.replace('/')} style={{ margin: 24 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={issues}
        keyExtractor={(i) => i.id}
        style={contentWidth}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 140 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Animated.View entering={FadeInLeft}>
              <Card>
                <Muted>
                  {[
                    project.area,
                    project.plotNumber ? `Plot ${project.plotNumber}` : '',
                    project.reference,
                    project.client,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Muted>
                {project.address ? <Muted style={{ marginTop: 4 }}>{project.address}</Muted> : null}
                <View style={styles.counts}>
                  <Pill label={`${counts.total} total`} color={c.fab} />
                  <Pill label={`${counts.incomplete} open`} color={c.accent} />
                  <Pill label={`${counts.completed} done`} color={c.success} />
                </View>
              </Card>
            </Animated.View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <Button
                label="Quick capture"
                onPress={() => router.push(`/quick-capture/${id}`)}
                style={{ flexGrow: 1 }}
              />
              <Button label="Add issue" variant="secondary" onPress={addIssue} style={{ flexGrow: 1 }} />
              <Button
                label="Share report"
                variant="secondary"
                onPress={() => router.push(`/report/${id}`)}
                style={{ flexGrow: 1 }}
              />
            </View>
            <TextInput
              placeholder={`Search ${wording.issuePlural.toLowerCase()}…`}
              placeholderTextColor={c.textMuted}
              value={search}
              onChangeText={setSearch}
              style={{
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                color: c.text,
                borderRadius: 12,
                padding: 12,
                minHeight: 48,
                marginBottom: 8,
              }}
            />
            <Button
              label={showFilters ? 'Hide filters' : 'Filters'}
              variant="ghost"
              onPress={() => setShowFilters((v) => !v)}
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
            />
            {showFilters ? (
              <View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Chip label="All status" active={!statusFilter} onPress={() => setStatusFilter(undefined)} />
                  {STATUSES.map((s) => (
                    <Chip
                      key={s}
                      label={s.replace(/_/g, ' ')}
                      active={statusFilter === s}
                      onPress={() => setStatusFilter(s)}
                    />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Chip
                    label="All priority"
                    active={!priorityFilter}
                    onPress={() => setPriorityFilter(undefined)}
                  />
                  {PRIORITIES.map((p) => (
                    <Chip
                      key={p}
                      label={p}
                      active={priorityFilter === p}
                      onPress={() => setPriorityFilter(p)}
                    />
                  ))}
                </View>
                <View style={styles.filters}>
                  <Filter label="Hide completed" value={hideCompleted} onChange={setHideCompleted} />
                  <Filter label="Hide unassigned" value={hideUnassigned} onChange={setHideUnassigned} />
                  <Filter label="Newest first" value={newestFirst} onChange={setNewestFirst} />
                </View>
                <Button
                  label="Apply template…"
                  variant="secondary"
                  onPress={() => setShowTemplates(true)}
                  style={{ marginBottom: 8 }}
                />
              </View>
            ) : null}
            {selectMode && selected.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <Button label="Select all" variant="secondary" onPress={() => setSelected(issues.map((i) => i.id))} />
                <Button label="Clear" variant="ghost" onPress={() => setSelected([])} />
                <Button label="Assignee" onPress={() => setAssigneeOpen(true)} />
                <Button
                  label="Due +7"
                  variant="secondary"
                  onPress={async () => {
                    await repo.multiUpdateIssues(selected, {
                      dueDate: addDays(startOfDay(new Date()), 7).getTime(),
                    });
                    setSelected([]);
                    await reload();
                  }}
                />
                <Button
                  label="Complete"
                  onPress={async () => {
                    await repo.multiUpdateIssues(selected, { completed: 1, status: 'closed' });
                    if (id) await repo.refreshProjectCompletion(id);
                    playSfx('complete');
                    setSelected([]);
                    await reload();
                  }}
                />
                <Button
                  label="Reopen"
                  variant="secondary"
                  onPress={async () => {
                    await repo.multiUpdateIssues(selected, { completed: 0, status: 'open' });
                    if (id) await repo.refreshProjectCompletion(id);
                    setSelected([]);
                    await reload();
                  }}
                />
                <Button label="Delete" variant="danger" onPress={() => setConfirmDelete(true)} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View>
            <EmptyState
              title={`No ${wording.issuePlural.toLowerCase()} yet`}
              body="1. Quick capture photos  ·  2. Annotate if needed  ·  3. Share a report"
            />
            <Button
              label="Quick capture"
              onPress={() => router.push(`/quick-capture/${id}`)}
              style={{ marginHorizontal: 24 }}
            />
          </View>
        }
        renderItem={({ item, index }) => {
          const active = selected.includes(item.id);
          const overdue = item.dueDate && item.dueDate < Date.now() && !item.completed;
          return (
            <Animated.View>
              <Card style={active ? { borderColor: c.accent, borderWidth: 2 } : undefined}>
                <Pressable
                  onPress={() =>
                    selectMode ? toggleSelect(item.id) : router.push(`/issue/${item.id}`)
                  }
                  style={{ flexDirection: 'row', gap: 12 }}
                >
                  {selectMode ? (
                    <View
                      style={[
                        styles.checkBig,
                        {
                          borderColor: active ? c.accent : c.border,
                          backgroundColor: active ? c.accent : 'transparent',
                        },
                      ]}
                    />
                  ) : thumbs[item.id] ? (
                    <Image
                      source={{ uri: cacheBustUri(thumbs[item.id], thumbs[item.id]) }}
                      style={styles.thumb}
                    />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: c.surfaceElevated, borderColor: c.border }]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Title>
                      #{item.snagNumber ?? index + 1}{' '}
                      {item.title || `${wording.issueSingular}`}
                    </Title>
                    <Muted>
                      {[
                        item.priority,
                        item.status?.replace(/_/g, ' '),
                        item.location,
                        item.trade,
                        item.assignee || 'Unassigned',
                        item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString()}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Muted>
                    {overdue ? (
                      <Text style={{ color: c.danger, fontWeight: '700', marginTop: 4 }}>Overdue</Text>
                    ) : null}
                    {selectMode ? (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                        <Button
                          label="↑"
                          variant="ghost"
                          style={{ paddingVertical: 6, paddingHorizontal: 12, minHeight: 44 }}
                          disabled={index === 0}
                          onPress={async () => {
                            if (!id || index === 0) return;
                            const all = await repo.listIssues(id);
                            const ids = all.map((i) => i.id);
                            const at = ids.indexOf(item.id);
                            if (at <= 0) return;
                            [ids[at - 1], ids[at]] = [ids[at], ids[at - 1]];
                            await repo.reorderIssues(id, ids);
                            await reload();
                          }}
                        />
                        <Button
                          label="↓"
                          variant="ghost"
                          style={{ paddingVertical: 6, paddingHorizontal: 12, minHeight: 44 }}
                          onPress={async () => {
                            if (!id) return;
                            const all = await repo.listIssues(id);
                            const ids = all.map((i) => i.id);
                            const at = ids.indexOf(item.id);
                            if (at < 0 || at >= ids.length - 1) return;
                            [ids[at + 1], ids[at]] = [ids[at], ids[at + 1]];
                            await repo.reorderIssues(id, ids);
                            await reload();
                          }}
                        />
                      </View>
                    ) : null}
                  </View>
                  {!selectMode ? (
                    <Pressable
                      accessibilityLabel="Toggle complete"
                      onPress={async () => {
                        await repo.updateIssue(item.id, {
                          completed: item.completed ? 0 : 1,
                          status: item.completed ? 'open' : 'closed',
                        });
                        if (id) await repo.refreshProjectCompletion(id);
                        playSfx('complete');
                        await reload();
                      }}
                      style={[
                        styles.checkBig,
                        {
                          borderColor: item.completed ? c.success : c.border,
                          backgroundColor: item.completed ? c.success : 'transparent',
                        },
                      ]}
                    />
                  ) : null}
                </Pressable>
              </Card>
            </Animated.View>
          );
        }}
      />

      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: c.surface,
            borderTopColor: c.border,
            paddingBottom: 12 + insets.bottom,
          },
        ]}
      >
        <Button label="Gallery" variant="secondary" onPress={() => void addFromLibrary()} style={styles.barBtn} />
        <Button label="Report" onPress={() => router.push(`/report/${id}`)} style={styles.barBtn} />
      </View>

      <PromptModal
        visible={assigneeOpen}
        title="Set assignee"
        placeholder="Name or trade"
        onCancel={() => setAssigneeOpen(false)}
        onConfirm={async (value) => {
          setAssigneeOpen(false);
          await repo.multiUpdateIssues(selected, { assignee: value.trim() });
          setSelected([]);
          await reload();
        }}
      />
      <ConfirmModal
        visible={confirmDelete}
        title={`Delete ${selected.length} ${wording.issuePlural.toLowerCase()}?`}
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await repo.deleteIssues(selected);
          playSfx('delete');
          setSelected([]);
          await reload();
        }}
      />
      <ConfirmModal
        visible={showTemplates && !templates.length}
        title="Apply template"
        message="No templates yet. Create one in the Library tab."
        confirmLabel="Close"
        onCancel={() => setShowTemplates(false)}
        onConfirm={() => setShowTemplates(false)}
      />
      {showTemplates && templates.length ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 100 + insets.bottom,
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            gap: 8,
          }}
        >
          <Title style={{ fontSize: 16 }}>Apply template</Title>
          {templates.map((t) => (
            <Button
              key={t.id}
              label={`${t.title} (${t.itemCount})`}
              variant={templatePickId === t.id ? 'primary' : 'secondary'}
              onPress={() => setTemplatePickId(t.id)}
            />
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label="Cancel"
              variant="ghost"
              style={{ flex: 1 }}
              onPress={() => {
                setShowTemplates(false);
                setTemplatePickId(null);
              }}
            />
            <Button
              label="Apply"
              style={{ flex: 1 }}
              disabled={!templatePickId}
              onPress={async () => {
                if (!templatePickId || !id) return;
                await repo.applyTemplateToProject(id, templatePickId);
                playSfx('add');
                setShowTemplates(false);
                setTemplatePickId(null);
                await reload();
              }}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, minHeight: 36, justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function Filter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12, marginBottom: 8, minHeight: 44 }}>
      <Switch value={value} onValueChange={onChange} />
      <Text style={{ color: c.text, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  checkBig: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#111',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
  barBtn: { flex: 1, minHeight: 48 },
});
