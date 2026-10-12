import React, { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter, type Href } from 'expo-router';
import { Button, contentWidth, Muted, Screen } from '@/src/components/ui';
import { HELP_TOPICS } from '@/src/content/helpTopics';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

export default function HelpTopicScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const c = useAppTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const item = HELP_TOPICS.find((t) => t.id === topic);

  useLayoutEffect(() => {
    navigation.setOptions({ title: item?.title ?? 'Help' });
  }, [navigation, item?.title]);

  if (!item) {
    return (
      <Screen>
        <View style={{ padding: spacing.lg }}>
          <Muted>Topic not found.</Muted>
          <Button
            label="Back to Help"
            onPress={() => router.replace('/help' as Href)}
            style={{ marginTop: 16 }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={contentWidth} contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
        <Text style={[styles.body, { color: c.text }]}>{item.body}</Text>
        {item.bullets?.length ? <BulletList items={item.bullets} /> : null}
        <Button label={item.cta} onPress={() => router.push(item.href)} style={{ marginTop: 24 }} />
        <Button
          label="All topics"
          variant="ghost"
          onPress={() => router.replace('/help' as Href)}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </Screen>
  );
}

function BulletList({ items }: { items: string[] }) {
  const c = useAppTheme();
  return (
    <View style={{ marginTop: 20, gap: 10 }}>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
          <Text style={{ color: c.accent, fontWeight: '700' }}>▸</Text>
          <Text style={{ color: c.text, flex: 1, lineHeight: 22, fontSize: 15 }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'System',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'System',
  },
});
