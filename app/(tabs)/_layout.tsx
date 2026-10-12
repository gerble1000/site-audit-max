import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/theme/ThemeProvider';

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const c = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarPad = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopColor: c.border,
          height: 56 + tabBarPad,
          paddingBottom: tabBarPad,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, marginBottom: 2 },
        headerStyle: { backgroundColor: c.header },
        headerTintColor: c.headerText,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Projects',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="folder-open" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="folders"
        options={{
          title: 'Folders',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="th-large" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <TabIcon name="book" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="cog" color={String(color)} />,
        }}
      />
    </Tabs>
  );
}
