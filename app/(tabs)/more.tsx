import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Button, Card, contentWidth, EmptyState, Muted, Screen, Title } from '@/src/components/ui';
import { PromptModal } from '@/src/components/modals/PromptModal';
import { HELP_SECTIONS } from '@/src/content/helpTopics';
import * as repo from '@/src/db/repository';
import { playSfx } from '@/src/services/sfx';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';
import type { Contact } from '@/src/types';

export default function MoreScreen() {
  const router = useRouter();
  const c = useAppTheme();
  const [templates, setTemplates] = useState<{ id: string; title: string; itemCount: number }[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactOpen, setContactOpen] = useState(false);

  const reload = useCallback(async () => {
    setTemplates(await repo.listTemplates());
    setContacts(await repo.listContacts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return (
    <Screen>
      <FlatList
        data={templates}
        keyExtractor={(i) => i.id}
        style={contentWidth}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            {HELP_SECTIONS.map((section) => (
              <View key={section.label}>
                <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{section.label}</Text>
                {section.topics.map((topic, index) => (
                  <Pressable
                    key={topic.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/help/${topic.id}` as Href)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        borderBottomColor: c.border,
                        backgroundColor: pressed ? c.surfaceElevated : 'transparent',
                      },
                      index === 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: c.border,
                      },
                    ]}
                  >
                    <Text style={[styles.rowTitle, { color: c.text }]}>{topic.title}</Text>
                    <FontAwesome name="chevron-right" size={14} color={c.textMuted} />
                  </Pressable>
                ))}
              </View>
            ))}

            <View style={{ padding: spacing.md, gap: 12 }}>
              <Card>
                <Title>Templates</Title>
                <Muted>Apply a checklist to a project from the project screen.</Muted>
                <Button
                  label="Create soft-landing template"
                  variant="secondary"
                  style={{ marginTop: 10 }}
                  onPress={async () => {
                    await repo.createTemplate('Soft landing', [
                      { title: 'Keys & fobs', trade: 'Management', location: 'Entrance' },
                      { title: 'Meter readings', trade: 'Utilities', location: 'Cupboard' },
                      { title: 'Appliance demo', trade: 'Client', location: 'Kitchen' },
                    ]);
                    playSfx('add');
                    await reload();
                  }}
                />
              </Card>
              <Card>
                <Title>Contacts / trades</Title>
                <Muted>Pick these as assignees on issues.</Muted>
                <Button label="Add contact" style={{ marginTop: 10 }} onPress={() => setContactOpen(true)} />
                {contacts.map((ct) => (
                  <View
                    key={ct.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 10,
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Title style={{ fontSize: 15 }}>{ct.name}</Title>
                      <Muted>{[ct.trade, ct.phone].filter(Boolean).join(' · ') || 'No trade'}</Muted>
                    </View>
                    <Button
                      label="Delete"
                      variant="danger"
                      onPress={async () => {
                        await repo.deleteContact(ct.id);
                        await reload();
                      }}
                    />
                  </View>
                ))}
              </Card>
              <Title>Saved templates</Title>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No templates" body="Create one above." />
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Card>
              <Title>{item.title}</Title>
              <Muted>{item.itemCount} items</Muted>
            </Card>
          </View>
        )}
      />
      <PromptModal
        visible={contactOpen}
        title="New contact"
        placeholder="Name (optional: Trade)"
        message="Tip: enter like 'Alex | Plumbing'"
        onCancel={() => setContactOpen(false)}
        onConfirm={async (value) => {
          setContactOpen(false);
          const [name, trade] = value.split('|').map((s) => s.trim());
          await repo.createContact({ name: name || 'Contact', trade: trade || '' });
          playSfx('add');
          await reload();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 20,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
    paddingRight: 12,
  },
});
