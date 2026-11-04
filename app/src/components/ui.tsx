import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const theme = useTheme();
  const full = Math.round(value);
  return (
    <ThemedText style={{ fontSize: size, lineHeight: size + 4, color: theme.star }} accessibilityLabel={`${value.toFixed(1)} / 5`}>
      {'★'.repeat(full)}
      <ThemedText style={{ fontSize: size, lineHeight: size + 4, color: theme.border }}>{'★'.repeat(5 - full)}</ThemedText>
    </ThemedText>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n}`}>
          <ThemedText style={{ fontSize: 30, lineHeight: 36, color: n <= value ? theme.star : theme.border }}>★</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'positive' | 'negative' }) {
  const theme = useTheme();
  const activeColor = tone ? theme[tone] : theme.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? activeColor : theme.border, backgroundColor: selected ? activeColor : 'transparent' },
        pressed && { opacity: 0.7 },
      ]}>
      <ThemedText type="small" style={{ color: selected ? theme.background : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; tone?: 'positive' | 'negative' }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={[styles.row, { flexWrap: 'wrap', gap: Spacing.two }]}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} tone={o.tone} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

export function Badge({ label, color }: { label: string; color: ThemeColor }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { borderColor: theme[color] }]}>
      <ThemedText style={[styles.badgeText, { color: theme[color] }]}>{label}</ThemedText>
    </View>
  );
}

export function StatTile({ value, label, color = 'text' }: { value: string; label: string; color?: ThemeColor }) {
  const theme = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={[styles.statValue, { color: theme[color] }]}>{value}</ThemedText>
      <ThemedText style={styles.statLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

export function AspectBar({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.one }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="smallBold">{value.toFixed(1)}</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { width: `${(value / 5) * 100}%`, backgroundColor: value < 3 ? theme.negative : theme.accent }]} />
      </View>
    </View>
  );
}

export function Section({ title, children, style }: { title: string; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ gap: Spacing.three }, style]}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }]}>
      <ThemedText style={{ color: theme.onAccent, fontWeight: 700 }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, lineHeight: 16, fontWeight: 700 },
  statTile: { flex: 1, padding: Spacing.three, borderRadius: 16, gap: Spacing.one },
  statValue: { fontSize: 26, lineHeight: 32, fontWeight: 700 },
  statLabel: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontWeight: 700 },
  button: { paddingVertical: 14, paddingHorizontal: Spacing.four, borderRadius: 14, alignItems: 'center' },
});
