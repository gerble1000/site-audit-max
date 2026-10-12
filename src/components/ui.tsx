import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useAppTheme } from '../theme/ThemeProvider';
import { radii, spacing } from '../theme/tokens';

/** Caps content width so large tablets stay readable instead of stretching edge-to-edge. */
export const contentWidth = {
  width: '100%' as const,
  maxWidth: 760,
  alignSelf: 'center' as const,
};

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useAppTheme();
  return <View style={[{ flex: 1, backgroundColor: c.background }, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const c = useAppTheme();
  const body = (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOut}
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }
  return body;
}

export function Title({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useAppTheme();
  return <Text style={[styles.title, { color: c.text }, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useAppTheme();
  return <Text style={[styles.muted, { color: c.textMuted }, style]}>{children}</Text>;
}

export function Button({
  label,
  variant = 'primary',
  style,
  ...rest
}: PressableProps & { label: string; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const c = useAppTheme();
  const bg =
    variant === 'primary'
      ? c.fab
      : variant === 'danger'
        ? c.danger
        : variant === 'secondary'
          ? c.surfaceElevated
          : 'transparent';
  const color = variant === 'secondary' || variant === 'ghost' ? c.text : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: c.border,
          opacity: pressed || rest.disabled ? 0.7 : 1,
          borderWidth: variant === 'ghost' || variant === 'secondary' ? 1 : 0,
        },
        style as ViewStyle,
      ]}
      {...rest}
    >
      <Text style={[styles.btnText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Fab({ onPress, label = '+' }: { onPress: () => void; label?: string }) {
  const c = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add"
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: c.accent, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <Text style={styles.fabText}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const c = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? c.accentSoft : c.surfaceElevated,
          borderColor: color || (active ? c.accent : c.border),
        },
      ]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={{ color: c.text, fontWeight: active ? '700' : '500', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty} accessibilityRole="summary">
      <Title style={{ textAlign: 'center' }}>{title}</Title>
      <Muted style={{ textAlign: 'center', marginTop: 8 }}>{body}</Muted>
    </View>
  );
}

export function LargeTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useAppTheme();
  return <Text style={[styles.largeTitle, { color: c.text }, style]}>{children}</Text>;
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useAppTheme();
  return <Text style={[styles.sectionLabel, { color: c.textMuted }, style]}>{children}</Text>;
}

export function ListRow({
  title,
  subtitle,
  onPress,
  onLongPress,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const c = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.listRow,
        { borderBottomColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.listRowTitle, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.listRowMeta, { color: c.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'System',
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: 'System',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
  },
  listRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  listRowMeta: {
    fontSize: 13,
    marginTop: 3,
    fontFamily: 'System',
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'System',
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 0,
    fontFamily: 'System',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: -2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
});
