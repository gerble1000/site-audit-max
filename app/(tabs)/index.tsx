import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  Text,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Button, contentWidth, EmptyState, Muted, Screen } from '@/src/components/ui';
import { CreateProjectModal } from '@/src/components/modals/CreateProjectModal';
import { useAppStore } from '@/src/store/useAppStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import * as repo from '@/src/db/repository';
import type { ProjectStats } from '@/src/db/repository';
import { cacheBustUri } from '@/src/services/media';
import { playSfx } from '@/src/services/sfx';
import { radii, spacing } from '@/src/theme/tokens';
import type { StatusKey } from '@/src/theme/tokens';
import type { AppSettings, Project } from '@/src/types';

type StatusFilter = 'all' | 'active' | 'overdue' | 'completed';

const EMPTY_STATS: ProjectStats = {
  total: 0,
  open: 0,
  closed: 0,
  critical: 0,
  overdue: 0,
  photos: 0,
};

const SORT_CYCLE: AppSettings['projectSort'][] = ['date_desc', 'date_asc', 'title', 'reference'];

function sortLabel(sort: AppSettings['projectSort'] | undefined) {
  switch (sort) {
    case 'date_asc':
      return 'Oldest First';
    case 'title':
      return 'Name';
    case 'reference':
      return 'Reference';
    default:
      return 'Recently Updated';
  }
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Updated ${days}d ago`;
  return `Updated ${new Date(ts).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })}`;
}

function projectSubtitle(item: Project) {
  const bits = [
    item.area,
    item.plotNumber ? `Plot ${item.plotNumber}` : '',
    item.reference,
    item.phase,
  ].filter(Boolean);
  return bits.join(' · ') || item.client || '';
}

function deriveStatusKey(project: Project, stats: ProjectStats): StatusKey {
  if (project.completed || (stats.total > 0 && stats.open === 0)) return 'completed';
  if (stats.overdue > 0) return 'overdue';
  if (stats.critical > 0) return 'critical';
  if (stats.open > 0) return 'inProgress';
  return 'notStarted';
}

function CircleIcon({
  name,
  onPress,
  accent,
}: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  onPress: () => void;
  accent?: boolean;
}) {
  const c = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.circleBtn,
        {
          backgroundColor: c.surfaceElevated,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <FontAwesome name={name} size={16} color={accent ? c.accent : c.textMuted} />
    </Pressable>
  );
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const c = useAppTheme();
  const [trackWidth, setTrackWidth] = React.useState(0);
  const fill = useSharedValue(0);
  React.useEffect(() => {
    fill.value = withSpring(Math.max(0, Math.min(1, progress)), {
      damping: 18,
      stiffness: 120,
    });
  }, [progress, fill]);
  const fillStyle = useAnimatedStyle(() => ({
    width: fill.value * trackWidth,
  }));
  return (
    <View
      style={[styles.progressTrack, { backgroundColor: c.border }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

function ProjectCard({
  item,
  stats,
  index,
  issuePlural,
  onOpen,
  onMenu,
}: {
  item: Project;
  stats: ProjectStats;
  index: number;
  issuePlural: string;
  onOpen: () => void;
  onMenu: () => void;
}) {
  const c = useAppTheme();
  const statusKey = deriveStatusKey(item, stats);
  const status = c.status[statusKey];
  const pct = stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;
  const subtitle = projectSubtitle(item);
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 40)
        .springify()
        .damping(18)}
      style={{ marginBottom: 12 }}
    >
      <Pressable
        onPress={onOpen}
        onLongPress={onMenu}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 20, stiffness: 300 });
        }}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
            },
            pressStyle,
          ]}
        >
          <View style={styles.cardTop}>
            {item.coverUri ? (
              <Image
                source={{ uri: cacheBustUri(item.coverUri, item.updatedAt) }}
                style={styles.thumb}
              />
            ) : (
              <View style={[styles.thumb, { backgroundColor: c.surfaceElevated }]}>
                <FontAwesome name="image" size={22} color={c.textMuted} />
              </View>
            )}

            <View style={styles.cardMain}>
              <View style={styles.titleRow}>
                <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                  {item.pinned ? '★ ' : ''}
                  {item.title}
                </Text>
                <View style={[styles.badge, { backgroundColor: status.soft }]}>
                  <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              {subtitle ? (
                <Text style={[styles.cardMeta, { color: c.textMuted }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}

              {item.address ? (
                <View style={styles.addressRow}>
                  <FontAwesome name="map-marker" size={11} color={c.textMuted} />
                  <Text style={[styles.addressText, { color: c.textMuted }]} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              ) : null}

              <View style={styles.metricsRow}>
                <View style={styles.metricBlock}>
                  <Text
                    style={[
                      styles.metricBig,
                      { color: status.color, fontVariant: ['tabular-nums'] },
                    ]}
                  >
                    {stats.open}
                  </Text>
                  <Text style={[styles.metricLabel, { color: c.textMuted }]}>
                    Open {issuePlural}
                  </Text>
                </View>
                <View style={styles.metricBlockRight}>
                  <Text
                    style={[styles.metricPct, { color: c.text, fontVariant: ['tabular-nums'] }]}
                  >
                    {stats.total > 0 ? `${pct}%` : '—'}
                  </Text>
                  <Text style={[styles.metricLabel, { color: c.textMuted }]}>Complete</Text>
                </View>
              </View>

              {stats.total > 0 ? <ProgressBar progress={pct / 100} color={status.bar} /> : null}
            </View>

            <Pressable
              accessibilityLabel="Project options"
              hitSlop={12}
              onPress={onMenu}
              style={styles.chevronHit}
            >
              <FontAwesome name="chevron-right" size={14} color={c.textMuted} />
            </Pressable>
          </View>

          <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
            <View style={styles.footerItem}>
              <FontAwesome name="camera" size={12} color={c.textMuted} />
              <Text style={[styles.footerText, { color: c.textMuted }]}>
                {stats.photos} Photo{stats.photos === 1 ? '' : 's'}
              </Text>
            </View>
            {stats.critical > 0 ? (
              <View style={styles.footerItem}>
                <FontAwesome name="exclamation-triangle" size={12} color={c.status.critical.color} />
                <Text style={[styles.footerText, { color: c.status.critical.color }]}>
                  {stats.critical} Critical
                </Text>
              </View>
            ) : null}
            {stats.overdue > 0 ? (
              <View style={styles.footerItem}>
                <FontAwesome name="exclamation-circle" size={12} color={c.status.overdue.color} />
                <Text style={[styles.footerText, { color: c.status.overdue.color }]}>
                  {stats.overdue} Overdue
                </Text>
              </View>
            ) : null}
            <View style={[styles.footerItem, { marginLeft: 'auto' }]}>
              <FontAwesome name="clock-o" size={12} color={c.textMuted} />
              <Text style={[styles.footerText, { color: c.textMuted }]}>
                {relativeTime(item.updatedAt || item.createdAt)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function StatsBar({
  projects,
  openSnags,
  closedToday,
  criticalSnags,
  issuePlural,
}: {
  projects: number;
  openSnags: number;
  closedToday: number;
  criticalSnags: number;
  issuePlural: string;
}) {
  const c = useAppTheme();
  const items = [
    {
      icon: 'folder-open' as const,
      label: 'Projects',
      value: projects,
      color: c.accent,
    },
    {
      icon: 'clipboard' as const,
      label: `Open ${issuePlural}`,
      value: openSnags,
      color: c.status.critical.color,
    },
    {
      icon: 'check-circle' as const,
      label: 'Closed Today',
      value: closedToday,
      color: c.status.inProgress.color,
    },
    {
      icon: 'exclamation-triangle' as const,
      label: 'Critical',
      value: criticalSnags,
      color: c.status.overdue.color,
    },
  ];

  return (
    <View
      style={[
        styles.statsBar,
        {
          backgroundColor: c.surface,
          borderTopColor: c.border,
        },
      ]}
    >
      {items.map((item) => (
        <View key={item.label} style={styles.statsItem}>
          <FontAwesome name={item.icon} size={16} color={item.color} />
          <Text
            style={[styles.statsValue, { color: c.text, fontVariant: ['tabular-nums'] }]}
          >
            {item.value}
          </Text>
          <Text style={[styles.statsLabel, { color: c.textMuted }]} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function ProjectsScreen() {
  const c = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const projects = useAppStore((s) => s.projects);
  const projectStats = useAppStore((s) => s.projectStats);
  const dashboard = useAppStore((s) => s.dashboard);
  const folders = useAppStore((s) => s.folders);
  const search = useAppStore((s) => s.search);
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const settings = useAppStore((s) => s.settings);
  const wording = useAppStore((s) => s.wording);
  const setSearch = useAppStore((s) => s.setSearch);
  const setSelectedFolderId = useAppStore((s) => s.setSelectedFolderId);
  const refreshProjects = useAppStore((s) => s.refreshProjects);
  const refreshFolders = useAppStore((s) => s.refreshFolders);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useFocusEffect(
    useCallback(() => {
      void refreshProjects();
      void refreshFolders();
    }, [refreshProjects, refreshFolders])
  );

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const stats = projectStats[p.id] ?? EMPTY_STATS;
      if (statusFilter === 'active') return !p.completed;
      if (statusFilter === 'overdue') return stats.overdue > 0;
      if (statusFilter === 'completed') return !!p.completed;
      return true;
    });
  }, [projects, projectStats, statusFilter]);

  const createNamed = async (values: { title: string; area: string; plotNumber: string }) => {
    setCreateOpen(false);
    const p = await repo.createProject({
      title: values.title || 'Untitled project',
      area: values.area,
      plotNumber: values.plotNumber,
      folderId: selectedFolderId && selectedFolderId !== null ? selectedFolderId : null,
    });
    playSfx('add');
    await refreshProjects();
    router.push(`/project/${p.id}`);
  };

  const openMore = () => {
    const options = ['Help & tips', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 1 },
        (i) => {
          if (i === 0) router.push('/help' as Href);
        }
      );
    } else {
      Alert.alert('More', undefined, [
        { text: 'Help & tips', onPress: () => router.push('/help' as Href) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const cycleSort = () => {
    const current = settings?.projectSort ?? 'date_desc';
    const idx = SORT_CYCLE.indexOf(current);
    const next = SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
    void patchSettings({ projectSort: next });
  };

  const runAction = async (project: Project, action: string) => {
    setMenuId(null);
    if (action === 'pin') {
      await repo.updateProject(project.id, { pinned: project.pinned ? 0 : 1 });
    } else if (action === 'duplicate') {
      await repo.duplicateProject(project.id);
      playSfx('add');
    } else if (action === 'complete') {
      await repo.updateProject(project.id, { completed: project.completed ? 0 : 1 });
      playSfx('complete');
    } else if (action === 'delete') {
      Alert.alert('Delete project?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await repo.deleteProject(project.id);
            playSfx('delete');
            await refreshProjects();
          },
        },
      ]);
      return;
    } else if (action === 'report') {
      router.push(`/report/${project.id}`);
      return;
    } else if (action === 'edit') {
      router.push(`/project-edit/${project.id}`);
      return;
    }
    await refreshProjects();
  };

  const openProjectMenu = (item: Project) => {
    const options = [
      'Open',
      'Edit details',
      'Report',
      item.pinned ? 'Unpin' : 'Pin',
      'Duplicate',
      item.completed ? 'Mark open' : 'Mark complete',
      'Delete',
      'Cancel',
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: 6, cancelButtonIndex: 7 },
        (i) => {
          if (i === 0) router.push(`/project/${item.id}`);
          else if (i === 1) void runAction(item, 'edit');
          else if (i === 2) void runAction(item, 'report');
          else if (i === 3) void runAction(item, 'pin');
          else if (i === 4) void runAction(item, 'duplicate');
          else if (i === 5) void runAction(item, 'complete');
          else if (i === 6) void runAction(item, 'delete');
        }
      );
    } else {
      setMenuId(menuId === item.id ? null : item.id);
    }
  };

  const statusChips: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'completed', label: 'Completed' },
  ];

  const listHeader = (
    <View style={{ paddingBottom: 8 }}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <Text style={[styles.largeTitle, { color: c.text }]}>Projects</Text>
        <View style={styles.actions}>
          <CircleIcon name="ellipsis-h" onPress={openMore} />
          <CircleIcon name="plus" onPress={() => setCreateOpen(true)} accent />
          <CircleIcon
            name="search"
            onPress={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setSearch('');
            }}
          />
        </View>
      </View>

      {searchOpen ? (
        <TextInput
          autoFocus
          placeholder="Search projects…"
          placeholderTextColor={c.textMuted}
          value={search}
          onChangeText={setSearch}
          style={[
            styles.search,
            { backgroundColor: c.surfaceElevated, borderColor: c.border, color: c.text },
          ]}
        />
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {statusChips.map((chip) => (
          <FilterChip
            key={chip.id}
            label={chip.label}
            active={statusFilter === chip.id}
            onPress={() => setStatusFilter(chip.id)}
          />
        ))}
      </ScrollView>

      {folders.length > 0 ? (
        <>
          <View style={[styles.chipDivider, { backgroundColor: c.border }]} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            <FilterChip
              label="All"
              active={selectedFolderId === undefined}
              onPress={() => setSelectedFolderId(undefined)}
            />
            <FilterChip
              label="Unfiled"
              active={selectedFolderId === null}
              onPress={() => setSelectedFolderId(null)}
            />
            {folders.map((f) => (
              <FilterChip
                key={f.id}
                label={f.title}
                color={f.color}
                active={selectedFolderId === f.id}
                onPress={() => setSelectedFolderId(f.id)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={[styles.metaCount, { color: c.textMuted }]}>
          {filtered.length} PROJECT{filtered.length === 1 ? '' : 'S'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={cycleSort}
          style={styles.sortBtn}
          hitSlop={8}
        >
          <Text style={[styles.sortText, { color: c.textMuted }]}>
            {sortLabel(settings?.projectSort)}
          </Text>
          <FontAwesome name="caret-down" size={12} color={c.textMuted} />
        </Pressable>
      </View>
    </View>
  );

  const statsBarHeight = 72;
  const listPadBottom = 40 + statsBarHeight;

  const list = (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={contentWidth}
        contentContainerStyle={{
          paddingBottom: listPadBottom,
          paddingHorizontal: spacing.md,
          flexGrow: 1,
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={{ paddingTop: 24 }}>
            <EmptyState
              title="No projects yet"
              body="1. Create a project  ·  2. Add photos  ·  3. Annotate  ·  4. Share a report"
            />
            <Button
              label="Create project"
              onPress={() => setCreateOpen(true)}
              style={{ marginHorizontal: 24 }}
            />
            <Button
              label="Help & tips"
              variant="ghost"
              onPress={() => router.push('/help' as Href)}
              style={{ marginHorizontal: 24, marginTop: 8 }}
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <View>
            <ProjectCard
              item={item}
              stats={projectStats[item.id] ?? EMPTY_STATS}
              index={index}
              issuePlural={wording.issuePlural}
              onOpen={() => router.push(`/project/${item.id}`)}
              onMenu={() => openProjectMenu(item)}
            />
            {menuId === item.id ? (
              <View
                style={[
                  styles.androidMenu,
                  { backgroundColor: c.surfaceElevated, borderColor: c.border },
                ]}
              >
                {(
                  [
                    ['edit', 'Edit'],
                    ['report', 'Report'],
                    ['pin', item.pinned ? 'Unpin' : 'Pin'],
                    ['duplicate', 'Duplicate'],
                    ['complete', item.completed ? 'Mark open' : 'Mark complete'],
                    ['delete', 'Delete'],
                  ] as const
                ).map(([id, label]) => (
                  <Pressable
                    key={id}
                    onPress={() => void runAction(item, id)}
                    style={styles.androidMenuItem}
                  >
                    <Text
                      style={{
                        color: id === 'delete' ? c.danger : c.text,
                        fontWeight: '600',
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}
      />
      <StatsBar
        projects={dashboard.projects}
        openSnags={dashboard.openSnags}
        closedToday={dashboard.closedToday}
        criticalSnags={dashboard.criticalSnags}
        issuePlural={wording.issuePlural}
      />
    </View>
  );

  return (
    <Screen>
      {isTablet ? (
        <View style={styles.tablet}>
          <View style={[styles.side, { borderRightColor: c.border, backgroundColor: c.surface }]}>
            <Text style={[styles.sideTitle, { color: c.text }]}>Folders</Text>
            <Pressable
              onPress={() => setSelectedFolderId(undefined)}
              style={[
                styles.sideItem,
                selectedFolderId === undefined && { backgroundColor: c.accentSoft },
              ]}
            >
              <Text style={{ color: c.text }}>All projects</Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedFolderId(null)}
              style={[
                styles.sideItem,
                selectedFolderId === null && { backgroundColor: c.accentSoft },
              ]}
            >
              <Text style={{ color: c.text }}>Unfiled</Text>
            </Pressable>
            {folders.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setSelectedFolderId(f.id)}
                style={[
                  styles.sideItem,
                  selectedFolderId === f.id && { backgroundColor: c.accentSoft },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: f.color }]} />
                <Text style={{ color: c.text, flex: 1 }}>{f.title}</Text>
                <Muted>{f.projectCount}</Muted>
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1 }}>{list}</View>
        </View>
      ) : (
        list
      )}
      <CreateProjectModal
        visible={createOpen}
        onCancel={() => setCreateOpen(false)}
        onConfirm={(values) => void createNamed(values)}
      />
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  color?: string;
}) {
  const c = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? c.accentSoft : 'transparent',
          borderColor: active ? c.accent : c.border,
        },
      ]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={{ color: active ? c.accent : c.textMuted, fontWeight: '600', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: 'System',
  },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 16,
    minHeight: 44,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
    gap: 0,
  },
  chipDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  metaCount: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: 'System',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 12,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: 'System',
  },
  cardMeta: {
    fontSize: 13,
    marginTop: 3,
    fontFamily: 'System',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'System',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metricBlock: {
    alignItems: 'flex-start',
  },
  metricBlockRight: {
    alignItems: 'flex-end',
  },
  metricBig: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
    fontFamily: 'System',
  },
  metricPct: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
    fontFamily: 'System',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  chevronHit: {
    width: 28,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
  },
  statsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'System',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'System',
  },
  androidMenu: {
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  androidMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  tablet: { flex: 1, flexDirection: 'row' },
  side: { width: 260, borderRightWidth: 1 },
  sideTitle: {
    fontSize: 20,
    fontWeight: '800',
    margin: 16,
    fontFamily: 'System',
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
