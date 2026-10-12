import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AnnotationCanvas } from '@/src/components/AnnotationCanvas';
import { Screen, Muted, Button } from '@/src/components/ui';
import * as repo from '@/src/db/repository';
import { resolveAnnotatedSourceUri, saveAnnotatedImage } from '@/src/services/media';
import { playSfx } from '@/src/services/sfx';
import type { IssueImage } from '@/src/types';

export default function AnnotateScreen() {
  const { imageId } = useLocalSearchParams<{ imageId: string }>();
  const router = useRouter();
  const [image, setImage] = useState<IssueImage | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!imageId) return;
      const img = await repo.getImage(imageId);
      if (!img) {
        setMissing(true);
        return;
      }
      setImage(img);
      const issue = await repo.getIssue(img.issueId);
      if (!issue?.projectId) {
        setMissing(true);
        return;
      }
      setProjectId(issue.projectId);
      const uri = await resolveAnnotatedSourceUri(img.uri, img.annotatedUri);
      setDisplayUri(uri);
    })();
  }, [imageId]);

  if (missing) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Muted>Photo not found.</Muted>
          <Button label="Close" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </Screen>
    );
  }

  if (!image || !projectId || !displayUri) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Muted style={{ marginTop: 12 }}>Loading photo…</Muted>
        </View>
      </Screen>
    );
  }

  return (
    <AnnotationCanvas
      imageUri={displayUri}
      onCancel={() => router.back()}
      onSave={async (base64) => {
        const uri = await saveAnnotatedImage(projectId, base64);
        await repo.updateImage(image.id, { annotatedUri: uri });
        await repo.refreshCoverAfterAnnotate(projectId, image.uri, uri);
        playSfx('complete');
        router.back();
      }}
    />
  );
}
