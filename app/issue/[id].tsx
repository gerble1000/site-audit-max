import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
  Text,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { addDays, startOfDay } from 'date-fns';
import { Button, Card, Chip, contentWidth, Muted, Screen, Title } from '@/src/components/ui';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useAppStore } from '@/src/store/useAppStore';
import * as repo from '@/src/db/repository';
import { pickImages, cacheBustUri } from '@/src/services/media';
import { playSfx } from '@/src/services/sfx';
import { startVoiceNote, stopVoiceNote, playVoiceNote } from '@/src/services/voice';
import { playVoice } from '@/src/services/voiceClips';
import type { Contact, ImageRole, Issue, IssueImage, IssuePriority, IssueStatus } from '@/src/types';
import { PRIORITIES, STATUSES } from '@/src/types';
import { spacing } from '@/src/theme/tokens';

export default function IssueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useAppTheme();
  const router = useRouter();
  const wording = useAppStore((s) => s.wording);
  const settings = useAppStore((s) => s.settings);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [images, setImages] = useState<IssueImage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [missing, setMissing] = useState(false);
  const [recording, setRecording] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    const iss = await repo.getIssue(id);
    if (!iss) {
      setMissing(true);
      setIssue(null);
      return;
    }
    setMissing(false);
    setIssue(iss);
    setImages(await repo.listImages(iss.id));
    setContacts(await repo.listContacts());
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  if (missing) {
    return (
      <Screen>
        <Muted style={{ padding: 24 }}>This issue was deleted.</Muted>
        <Button label="Go back" onPress={() => router.back()} style={{ margin: 24 }} />
      </Screen>
    );
  }

  if (!issue || !settings) {
    return (
      <Screen>
        <Muted style={{ padding: 24 }}>Loading…</Muted>
      </Screen>
    );
  }

  const saveField = async (patch: Partial<Issue>) => {
    await repo.updateIssue(issue.id, patch);
    const next = { ...issue, ...patch };
    setIssue(next);
    await repo.refreshProjectCompletion(issue.projectId);
  };

  const addPhotos = async (fromCamera: boolean) => {
    const assets = await pickImages({
      projectId: issue.projectId,
      quality: settings.imageQuality,
      square: !!settings.useSquareImages,
      allowsMultiple: !fromCamera,
      fromCamera,
    });
    const valid = assets.filter((a) => a.uri && !a.denied && !a.canceled);
    for (const asset of valid) {
      await repo.addImage(issue.id, asset);
    }
    if (valid.length) playSfx('capture');
    await reload();
  };

  const setDue = async (days: number | null) => {
    if (days == null) {
      await saveField({ dueDate: null });
      return;
    }
    await saveField({ dueDate: addDays(startOfDay(new Date()), days).getTime() });
  };

  return (
    <Screen>
      <ScrollView style={contentWidth} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <Card>
          <Title>
            #{issue.snagNumber ?? '—'} {wording.issueSingular}
          </Title>
          <Field
            label="Title"
            value={issue.title}
            onChangeText={(v) => setIssue({ ...issue, title: v })}
            onBlur={() => void saveField({ title: issue.title })}
            colors={c}
          />
          <Muted>Assignee</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
            {contacts.map((ct) => (
              <Chip
                key={ct.id}
                label={ct.name}
                active={issue.assignee === ct.name}
                onPress={() => void saveField({ assignee: ct.name, trade: ct.trade || issue.trade })}
              />
            ))}
          </View>
          <Field
            label="Assignee (text)"
            value={issue.assignee}
            onChangeText={(v) => setIssue({ ...issue, assignee: v })}
            onBlur={() => void saveField({ assignee: issue.assignee })}
            colors={c}
          />
          <Field
            label="Location / room"
            value={issue.location}
            onChangeText={(v) => setIssue({ ...issue, location: v })}
            onBlur={() => void saveField({ location: issue.location })}
            colors={c}
          />
          <Field
            label="Trade"
            value={issue.trade}
            onChangeText={(v) => setIssue({ ...issue, trade: v })}
            onBlur={() => void saveField({ trade: issue.trade })}
            colors={c}
          />
          <Field
            label="Category"
            value={issue.category}
            onChangeText={(v) => setIssue({ ...issue, category: v })}
            onBlur={() => void saveField({ category: issue.category })}
            colors={c}
          />
          <Muted>Priority</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
            {PRIORITIES.map((p) => (
              <Chip
                key={p}
                label={p}
                active={issue.priority === p}
                onPress={() => void saveField({ priority: p as IssuePriority })}
              />
            ))}
          </View>
          <Muted>Status</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
            {STATUSES.map((s) => (
              <Chip
                key={s}
                label={s.replace(/_/g, ' ')}
                active={issue.status === s}
                onPress={() =>
                  void saveField({
                    status: s as IssueStatus,
                    completed: s === 'closed' ? 1 : 0,
                  })
                }
              />
            ))}
          </View>
          <Field
            label="Comments"
            value={issue.comments}
            onChangeText={(v) => setIssue({ ...issue, comments: v })}
            onBlur={() => void saveField({ comments: issue.comments })}
            colors={c}
            multiline
          />
          <Field
            label="Remedial / closure notes"
            value={issue.remedialNotes}
            onChangeText={(v) => setIssue({ ...issue, remedialNotes: v })}
            onBlur={() => void saveField({ remedialNotes: issue.remedialNotes })}
            colors={c}
            multiline
          />
          <Muted>Due date</Muted>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <Button label="Today" variant="secondary" onPress={() => void setDue(0)} />
            <Button label="+3" variant="secondary" onPress={() => void setDue(3)} />
            <Button label="+7" variant="secondary" onPress={() => void setDue(7)} />
            <Button label="Clear" variant="ghost" onPress={() => void setDue(null)} />
          </View>
          {issue.dueDate ? (
            <Muted style={{ marginBottom: 8 }}>{new Date(issue.dueDate).toLocaleDateString()}</Muted>
          ) : null}

          <Muted>Voice note</Muted>
          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' }}>
            {!recording ? (
              <Button
                label="Record"
                variant="secondary"
                onPress={async () => {
                  try {
                    await startVoiceNote();
                    setRecording(true);
                  } catch (e) {
                    Alert.alert(
                      'Recording failed',
                      e instanceof Error ? e.message : 'Could not start recording.'
                    );
                  }
                }}
              />
            ) : (
              <Button
                label="Stop & save"
                onPress={async () => {
                  try {
                    const uri = await stopVoiceNote(issue.projectId);
                    setRecording(false);
                    if (uri) {
                      await saveField({ audioUri: uri });
                      playSfx('complete');
                    }
                  } catch (e) {
                    setRecording(false);
                    Alert.alert(
                      'Recording failed',
                      e instanceof Error ? e.message : 'Could not save the recording.'
                    );
                  }
                }}
              />
            )}
            {issue.audioUri ? (
              <Button label="Play" variant="ghost" onPress={() => void playVoiceNote(issue.audioUri!)} />
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              label={issue.completed ? 'Mark open' : 'Mark complete'}
              onPress={async () => {
                await saveField({
                  completed: issue.completed ? 0 : 1,
                  status: issue.completed ? 'open' : 'closed',
                });
                playSfx('complete');
                void playVoice('issue_complete');
              }}
            />
            <Button label="Camera" variant="secondary" onPress={() => void addPhotos(true)} />
            <Button label="Library" variant="secondary" onPress={() => void addPhotos(false)} />
            <Button
              label="Delete"
              variant="danger"
              onPress={() =>
                Alert.alert('Delete issue?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await repo.deleteIssue(issue.id);
                      playSfx('delete');
                      router.back();
                    },
                  },
                ])
              }
            />
          </View>
        </Card>

        <Title style={{ marginVertical: 12 }}>Photos ({images.length})</Title>
        {!images.length ? (
          <Button label="Take photo" onPress={() => void addPhotos(true)} />
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {images.map((img, index) => (
            <View key={img.id} style={{ width: '47%' }}>
              <Pressable onPress={() => router.push(`/annotate/${img.id}`)}>
                <Image
                  source={{
                    uri: cacheBustUri(img.annotatedUri || img.uri, img.annotatedUri || img.capturedAt),
                  }}
                  style={{ width: '100%', height: 140, borderRadius: 12, backgroundColor: c.surfaceElevated }}
                />
                <Text style={{ color: c.accent, marginTop: 4, fontWeight: '700', fontSize: 12 }}>Annotate</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                {(['evidence', 'before', 'after', 'context'] as ImageRole[]).map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    active={img.role === role}
                    onPress={() => void repo.updateImage(img.id, { role }).then(reload)}
                  />
                ))}
              </View>
              <TextInput
                placeholder="Caption"
                placeholderTextColor={c.textMuted}
                value={img.caption}
                onChangeText={(v) =>
                  setImages((list) => list.map((x) => (x.id === img.id ? { ...x, caption: v } : x)))
                }
                onBlur={() => void repo.updateImage(img.id, { caption: img.caption })}
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  color: c.text,
                  borderRadius: 8,
                  padding: 8,
                  marginTop: 4,
                }}
              />
              <Pressable
                onLongPress={() =>
                  Alert.alert('Photo', undefined, [
                    {
                      text: 'Move earlier',
                      onPress: async () => {
                        if (index === 0) return;
                        const ids = images.map((i) => i.id);
                        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                        await repo.reorderImages(issue.id, ids);
                        await reload();
                      },
                    },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await repo.deleteImage(img.id);
                        playSfx('delete');
                        await reload();
                      },
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }
              >
                <Muted style={{ marginTop: 4 }}>Long-press for move/delete</Muted>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  onBlur,
  colors,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  colors: ReturnType<typeof useAppTheme>;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Muted>{label}</Muted>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        multiline={multiline}
        style={{
          marginTop: 4,
          minHeight: multiline ? 90 : 48,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceElevated,
          color: colors.text,
          borderRadius: 10,
          padding: 12,
          textAlignVertical: multiline ? 'top' : 'center',
          fontSize: 16,
        }}
      />
    </View>
  );
}
