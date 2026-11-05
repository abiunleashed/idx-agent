import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarCard } from '@/components/car-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useCatalog } from '@/store/catalog';
import { useReviews } from '@/store/reviews';
import type { BodyType, Car } from '@/types';

const BODY_TYPES: BodyType[] = ['mpv', 'suv', 'lcgc', 'hatchback', 'ev'];
/** Cover heights cycle through these so the two columns stagger like Pinterest. */
const COVER_HEIGHTS = [210, 160, 240, 180, 150, 220];

export default function FeedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { reviews, error: reviewsError, reload } = useReviews();
  const { cars: catalog, loading, error: catalogError, reload: reloadCatalog } = useCatalog();
  const [query, setQuery] = useState('');
  const [bodyType, setBodyType] = useState<BodyType | 'all'>('all');

  const columns = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cars = catalog.filter(
      (c) => (bodyType === 'all' || c.bodyType === bodyType) && (!q || `${c.brand} ${c.model}`.toLowerCase().includes(q)),
    );
    // Most-reviewed first: that's where the useful information is.
    const count = (c: Car) => reviews.filter((r) => r.carId === c.id).length;
    cars.sort((a, b) => count(b) - count(a));

    // Masonry: put each card in whichever column is currently shorter.
    const cols: { car: Car; height: number }[][] = [[], []];
    const heights = [0, 0];
    cars.forEach((car, i) => {
      const height = COVER_HEIGHTS[i % COVER_HEIGHTS.length];
      const target = heights[0] <= heights[1] ? 0 : 1;
      cols[target].push({ car, height });
      heights[target] += height + 80;
    });
    return cols;
  }, [query, bodyType, reviews, catalog]);

  return (
    <ThemedView style={styles.flex}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + BottomTabInset + 96 },
        ]}>
        <View style={styles.header}>
          <ThemedText style={styles.brand}>{t('appName')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('tagline')}
          </ThemedText>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          returnKeyType="search"
          autoCorrect={false}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t('all')} selected={bodyType === 'all'} onPress={() => setBodyType('all')} />
          {BODY_TYPES.map((b) => (
            <Chip key={b} label={t(`bodyType_${b}`)} selected={bodyType === b} onPress={() => setBodyType(b)} />
          ))}
        </ScrollView>

        {loading && (
          <ThemedText type="small" themeColor="textSecondary">
            {t('loading')}
          </ThemedText>
        )}
        {(catalogError || reviewsError) && (
          <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">{t('loadFailed')}</ThemedText>
            <Chip label={t('retry')} onPress={() => Promise.all([reloadCatalog(), reload()])} />
          </View>
        )}

        <View style={styles.masonry}>
          {columns.map((col, ci) => (
            <View key={ci} style={styles.column}>
              {col.map(({ car, height }) => (
                <CarCard key={car.id} car={car} imageHeight={height} reviews={reviews.filter((r) => r.carId === car.id)} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => router.push('/review/new')}
        accessibilityRole="button"
        accessibilityLabel={t('writeReview')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, bottom: insets.bottom + BottomTabInset + Spacing.three, opacity: pressed ? 0.85 : 1 },
        ]}>
        <ThemedText style={{ color: theme.onAccent, fontWeight: 700 }}>✎ {t('writeReview')}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { gap: 2 },
  brand: { fontSize: 34, lineHeight: 40, fontWeight: 800, letterSpacing: -0.5 },
  search: { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: 12, fontSize: 16 },
  chips: { gap: Spacing.two },
  masonry: { flexDirection: 'row', gap: Spacing.three },
  errorBox: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two, alignItems: 'flex-start' },
  column: { flex: 1 },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
