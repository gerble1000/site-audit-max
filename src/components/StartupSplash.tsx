import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '../theme/tokens';

const MIN_MS = 3200;
const TRACK_INSET = 28;
const trackW = Dimensions.get('window').width - TRACK_INSET * 2;

export function StartupSplash({ onFinished }: { onFinished: () => void }) {
  const opacity = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 450 });
    progress.value = withTiming(1, { duration: MIN_MS, easing: Easing.linear });
    const timer = setTimeout(onFinished, MIN_MS);
    return () => clearTimeout(timer);
  }, [onFinished, opacity, progress]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const barFillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, Math.min(1, progress.value)) * trackW,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(400)}
      style={styles.root}
      accessibilityLabel="Site Audit Max startup"
    >
      <Animated.View style={[styles.imageWrap, fadeStyle]}>
        <Image
          source={require('../../assets/images/splash-brand.png')}
          style={styles.image}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel="Site Audit Max"
        />
      </Animated.View>
      <View style={styles.progressTrack} accessibilityRole="progressbar">
        <Animated.View style={[styles.progressFill, barFillStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.brandCream,
    zIndex: 100,
  },
  imageWrap: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  progressTrack: {
    position: 'absolute',
    left: TRACK_INSET,
    right: TRACK_INSET,
    bottom: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
