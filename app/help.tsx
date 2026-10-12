import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { contentWidth, Screen } from '@/src/components/ui';
import { HELP_SECTIONS } from '@/src/content/helpTopics';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

export default function HelpScreen() {
  const c = useAppTheme();
  const router = useRouter();

  return (
    <Screen>
      <ScrollView style={contentWidth} contentContainerStyle={{ paddingBottom: 48 }}>
        <Text style={[styles.intro, { color: c.textMuted }]}>
          How Site Audit Max works — tap a topic
        </Text>
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
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
