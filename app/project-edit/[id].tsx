import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, contentWidth, Muted, Screen, Title } from '@/src/components/ui';
import { SignaturePad } from '@/src/components/SignaturePad';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useAppStore } from '@/src/store/useAppStore';
import * as repo from '@/src/db/repository';
import { pickImages } from '@/src/services/media';
import type { Project } from '@/src/types';
import { spacing } from '@/src/theme/tokens';
import { playSfx } from '@/src/services/sfx';

export default function ProjectEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useAppTheme();
  const router = useRouter();
  const folders = useAppStore((s) => s.folders);
  const refreshProjects = useAppStore((s) => s.refreshProjects);
  const settings = useAppStore((s) => s.settings);
  const [project, setProject] = useState<Project | null>(null);
  const [showClientSig, setShowClientSig] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!id) return;
      setProject(await repo.getProject(id));
    })();
  }, [id]);

  if (!project || !settings) {
    return (
      <Screen>
        <Muted style={{ padding: 24 }}>Loading…</Muted>
      </Screen>
    );
  }

  const set = <K extends keyof Project>(key: K, value: Project[K]) =>
    setProject((p) => (p ? { ...p, [key]: value } : p));

  const save = async () => {
    await repo.updateProject(project.id, project);
    await refreshProjects();
    playSfx('complete');
    router.back();
  };

  const field = (label: string, key: keyof Project, multiline = false) => (
    <View style={{ marginBottom: 12 }}>
      <Muted>{label}</Muted>
      <TextInput
        value={String(project[key] ?? '')}
        onChangeText={(v) => set(key, v as never)}
        multiline={multiline}
        style={{
          marginTop: 4,
          minHeight: multiline ? 80 : undefined,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          color: c.text,
          borderRadius: 10,
          padding: 12,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );

  return (
    <Screen>
      <ScrollView style={contentWidth} contentContainerStyle={{ padding: spacing.md }}>
        <Card>
          <Title>Project details</Title>
          {field('Title', 'title')}
          {field('Area', 'area')}
          {field('Plot number', 'plotNumber')}
          {field('Phase', 'phase')}
          {field('Reference', 'reference')}
          {field('Client', 'client')}
          {field('Site address', 'address')}
          <Muted>Inspection date</Muted>
          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' }}>
            <Button
              label="Today"
              variant="secondary"
              onPress={() => set('inspectionDate', Date.now())}
            />
            <Button label="Clear" variant="ghost" onPress={() => set('inspectionDate', null)} />
          </View>
          {project.inspectionDate ? (
            <Muted style={{ marginBottom: 12 }}>
              {new Date(project.inspectionDate).toLocaleDateString()}
            </Muted>
          ) : (
            <Muted style={{ marginBottom: 12 }}>Not set</Muted>
          )}
          {field('Introduction', 'intro', true)}
          {field('Summary', 'summary', true)}
          {field('Notes', 'notes', true)}
          <Muted>Folder</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
            <Button
              label="Unfiled"
              variant={!project.folderId ? 'primary' : 'secondary'}
              onPress={() => set('folderId', null)}
            />
            {folders.map((f) => (
              <Button
                key={f.id}
                label={f.title}
                variant={project.folderId === f.id ? 'primary' : 'secondary'}
                onPress={() => set('folderId', f.id)}
              />
            ))}
          </View>
          {project.coverUri ? (
            <Image source={{ uri: project.coverUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} />
          ) : null}
          <Button
            label="Set cover photo"
            variant="secondary"
            style={{ marginTop: 8 }}
            onPress={async () => {
              const assets = await pickImages({
                projectId: project.id,
                quality: settings.imageQuality,
                square: false,
                allowsMultiple: false,
              });
              const valid = assets.find((a) => a.uri && !a.denied && !a.canceled);
              if (valid) set('coverUri', valid.uri);
            }}
          />
          <Button
            label="Floor plan pins"
            variant="secondary"
            style={{ marginTop: 8 }}
            onPress={() => router.push(`/floor-plan/${project.id}`)}
          />

          <Title style={{ marginTop: 20, fontSize: 16 }}>Client signature</Title>
          <Muted style={{ marginTop: 4 }}>Captured on site for this project’s reports.</Muted>
          {project.clientSignatureUri ? (
            <Image
              source={{ uri: project.clientSignatureUri }}
              style={{
                width: '100%',
                height: 100,
                borderRadius: 12,
                marginTop: 10,
                backgroundColor: '#fff',
              }}
              resizeMode="contain"
            />
          ) : null}
          {project.clientSignedAt ? (
            <Muted style={{ marginTop: 6 }}>
              Signed {new Date(project.clientSignedAt).toLocaleString()}
            </Muted>
          ) : null}
          {showClientSig ? (
            <View style={{ marginTop: 12 }}>
              <SignaturePad
                onCancel={() => setShowClientSig(false)}
                onSaved={(uri) => {
                  set('clientSignatureUri', uri);
                  set('clientSignedAt', Date.now());
                  setShowClientSig(false);
                  playSfx('complete');
                }}
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Button
                label="Capture client signature"
                variant="secondary"
                onPress={() => setShowClientSig(true)}
              />
              {project.clientSignatureUri ? (
                <Button
                  label="Clear"
                  variant="ghost"
                  onPress={() => {
                    set('clientSignatureUri', null);
                    set('clientSignedAt', null);
                  }}
                />
              ) : null}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <Button label="Save" onPress={save} style={{ flex: 1 }} />
            <Button
              label="Delete"
              variant="danger"
              onPress={() =>
                Alert.alert('Delete project?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await repo.deleteProject(project.id);
                      playSfx('delete');
                      await refreshProjects();
                      router.replace('/');
                    },
                  },
                ])
              }
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
