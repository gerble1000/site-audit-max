import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { StartupSplash } from '@/src/components/StartupSplash';
import { AppThemeProvider, useAppTheme } from '@/src/theme/ThemeProvider';
import { useAppStore } from '@/src/store/useAppStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync('#F5F5F0');

function hideSystemChrome() {
  StatusBar.setHidden(true, 'fade');
  if (Platform.OS === 'android') {
    NavigationBar.setHidden(true);
  }
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const init = useAppStore((s) => s.init);
  const ready = useAppStore((s) => s.ready);
  const [showStartup, setShowStartup] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    hideSystemChrome();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') hideSystemChrome();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loaded && ready) {
      SplashScreen.hideAsync();
    }
  }, [loaded, ready]);

  const finishStartup = useCallback(() => {
    setShowStartup(false);
  }, []);

  if (!loaded || !ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F0' }}>
        <ActivityIndicator color="#2F6B3A" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <StatusBar hidden />
        {Platform.OS === 'android' ? <NavigationBar hidden /> : null}
        <RootNav />
        {showStartup ? <StartupSplash onFinished={finishStartup} /> : null}
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootNav() {
  const c = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const onboardingDone = useAppStore((s) => s.settings?.onboardingDone);

  useEffect(() => {
    if (onboardingDone === 0 && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    }
  }, [onboardingDone, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.header },
        headerTintColor: c.headerText,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: c.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="project/[id]" options={{ title: 'Project' }} />
      <Stack.Screen name="issue/[id]" options={{ title: 'Issue' }} />
      <Stack.Screen name="annotate/[imageId]" options={{ title: 'Annotate', presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="report/[projectId]" options={{ title: 'Report' }} />
      <Stack.Screen name="project-edit/[id]" options={{ title: 'Edit project', presentation: 'modal' }} />
      <Stack.Screen
        name="quick-capture/[projectId]"
        options={{ title: 'Quick Snag', presentation: 'fullScreenModal', headerShown: false }}
      />
      <Stack.Screen name="floor-plan/[projectId]" options={{ title: 'Floor plan' }} />
      <Stack.Screen name="help" options={{ title: 'Help & tips' }} />
      <Stack.Screen name="help/[topic]" options={{ title: 'Help' }} />
    </Stack>
  );
}
