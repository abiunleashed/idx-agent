import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useCarVotes } from '@/store/votes';

export function VoteButtons({ carId, size = 'small' }: { carId: string; size?: 'small' | 'large' }) {
  const { up, down, mine, toggle } = useCarVotes(carId);
  const { t } = useI18n();
  const large = size === 'large';

  return (
    <View style={styles.row}>
      <VoteButton icon="👍" count={up} active={mine === 'up'} tone="positive" label={t('like')} large={large} onPress={() => toggle('up')} />
      <VoteButton icon="👎" count={down} active={mine === 'down'} tone="negative" label={t('dislike')} large={large} onPress={() => toggle('down')} />
    </View>
  );
}

function VoteButton({
  icon,
  count,
  active,
  tone,
  label,
  large,
  onPress,
}: {
  icon: string;
  count: number;
  active: boolean;
  tone: 'positive' | 'negative';
  label: string;
  large: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = theme[tone];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`${label} (${count})`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.button,
        large && styles.buttonLarge,
        { borderColor: active ? color : theme.border, backgroundColor: active ? color : 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText style={large ? styles.iconLarge : styles.icon}>{icon}</ThemedText>
      <ThemedText style={[large ? styles.countLarge : styles.count, { color: active ? theme.background : theme.text }]}>
        {large ? `${label} · ${count}` : count}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  button: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  buttonLarge: { paddingHorizontal: 16, paddingVertical: 8 },
  icon: { fontSize: 13, lineHeight: 18 },
  iconLarge: { fontSize: 17, lineHeight: 22 },
  count: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
  countLarge: { fontSize: 14, lineHeight: 20, fontWeight: 700 },
});
