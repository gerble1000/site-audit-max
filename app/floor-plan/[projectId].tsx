import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { PromptModal } from '@/src/components/modals/PromptModal';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useAppStore } from '@/src/store/useAppStore';
import * as repo from '@/src/db/repository';
import { pickImages } from '@/src/services/media';
import { playSfx } from '@/src/services/sfx';
import type { FloorPlan, FloorPlanPin, Issue } from '@/src/types';
import { spacing } from '@/src/theme/tokens';

export default function FloorPlanScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const c = useAppTheme();
  const settings = useAppStore((s) => s.settings);
  const { width } = useWindowDimensions();
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [active, setActive] = useState<FloorPlan | null>(null);
  const [pins, setPins] = useState<FloorPlanPin[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pickIssue, setPickIssue] = useState(false);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) return;
    const list = await repo.listFloorPlans(projectId);
    setPlans(list);
    setIssues(await repo.listIssues(projectId));
    if (active) {
      const still = list.find((p) => p.id === active.id) || list[0] || null;
      setActive(still);
      if (still) setPins(await repo.listPins(still.id));
    } else if (list[0]) {
      setActive(list[0]);
      setPins(await repo.listPins(list[0].id));
    }
  }, [projectId, active?.id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const addPlan = async () => {
    if (!projectId || !settings) return;
    const assets = await pickImages({
      projectId,
      quality: settings.imageQuality,
      square: false,
      allowsMultiple: false,
    });
    const valid = assets.find((a) => a.uri && !a.denied && !a.canceled);
    if (!valid) return;
    const plan = await repo.createFloorPlan(projectId, 'Floor plan', valid.uri);
    playSfx('add');
    setActive(plan);
    setPins([]);
    await reload();
  };

  const planWidth = Math.min(width - spacing.md * 2, 560);
  const planHeight = planWidth * 0.75;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <Button label="Add plan photo" onPress={() => void addPlan()} />
          {plans.map((p) => (
            <Button
              key={p.id}
              label={p.title}
              variant={active?.id === p.id ? 'primary' : 'secondary'}
              onPress={async () => {
                setActive(p);
                setPins(await repo.listPins(p.id));
              }}
            />
          ))}
        </View>
        {!active ? (
          <Card>
            <Title>Floor plans</Title>
            <Muted>Add a plan photo, then tap to pin snags.</Muted>
          </Card>
        ) : (
          <Pressable
            onPress={(e) => {
              const x = e.nativeEvent.locationX / planWidth;
              const y = e.nativeEvent.locationY / planHeight;
              setPending({ x, y });
              setPickIssue(true);
            }}
            style={{ width: planWidth, height: planHeight, borderRadius: 12, overflow: 'hidden' }}
          >
            <Image source={{ uri: active.uri }} style={{ width: '100%', height: '100%' }} />
            {pins.map((pin) => {
              const issue = issues.find((i) => i.id === pin.issueId);
              return (
                <View
                  key={pin.id}
                  style={[
                    styles.pin,
                    {
                      left: pin.x * planWidth - 14,
                      top: pin.y * planHeight - 14,
                      backgroundColor: c.accent,
                    },
                  ]}
                >
                  <Text style={styles.pinText}>{issue?.snagNumber ?? '•'}</Text>
                </View>
              );
            })}
          </Pressable>
        )}
        <Muted style={{ marginTop: 12 }}>Tap the plan to drop a pin linked to a snag.</Muted>
      </ScrollView>
      <PromptModal
        visible={pickIssue}
        title="Pin which snag #?"
        placeholder="Snag number"
        onCancel={() => {
          setPickIssue(false);
          setPending(null);
        }}
        onConfirm={async (value) => {
          setPickIssue(false);
          if (!active || !pending) return;
          const num = Number(value);
          const issue = issues.find((i) => i.snagNumber === num) || issues.find((i) => i.id === value);
          if (!issue) {
            Alert.alert('Not found', 'Enter an existing snag number');
            return;
          }
          await repo.upsertPin(active.id, issue.id, pending.x, pending.y);
          playSfx('complete');
          setPins(await repo.listPins(active.id));
          setPending(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
