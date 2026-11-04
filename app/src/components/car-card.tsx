import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Stars } from '@/components/ui';
import { VoteButtons } from '@/components/vote-buttons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatIDRRange, percent } from '@/lib/format';
import { summarize } from '@/lib/stats';
import type { Car, Review } from '@/types';

/**
 * Pinterest-style card. `imageHeight` varies per card so the two columns stagger.
 * Shows the first owner photo if one exists, otherwise a coloured placeholder.
 */
export function CarCard({ car, reviews, imageHeight }: { car: Car; reviews: Review[]; imageHeight: number }) {
  const theme = useTheme();
  const { t } = useI18n();
  const summary = summarize(reviews);
  const photo = reviews.flatMap((r) => r.photos)[0];

  return (
    <View style={styles.card}>
      <Link href={{ pathname: '/car/[id]', params: { id: car.id } }} asChild>
        <Pressable style={({ pressed }) => pressed && { opacity: 0.85 }}>
          <View style={[styles.cover, { height: imageHeight, backgroundColor: car.tint }]}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={styles.coverText}>
                <ThemedText style={styles.coverBrand}>{car.brand.toUpperCase()}</ThemedText>
                <ThemedText style={styles.coverModel}>{car.model}</ThemedText>
              </View>
            )}
            {summary && (
              <View
                style={[
                  styles.pill,
                  {
                    backgroundColor: summary.worthYes >= 0.5 ? theme.positive : theme.negative,
                  },
                ]}>
                <ThemedText style={styles.pillText}>
                  {percent(summary.worthYes)} {t('worthIt')}
                </ThemedText>
              </View>
            )}
          </View>
          <View style={styles.meta}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {car.brand} {car.model}
            </ThemedText>
            {summary ? (
              <View style={styles.row}>
                <Stars value={summary.avgOverall} size={12} />
                <ThemedText type="small" themeColor="textSecondary">
                  {summary.avgOverall.toFixed(1)} · {summary.count} {t('reviews')}
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {t('noReviewsYet')}
              </ThemedText>
            )}
            <ThemedText style={styles.price} themeColor="textSecondary" numberOfLines={1}>
              {formatIDRRange(car.priceMinIDR, car.priceMaxIDR)}
            </ThemedText>
          </View>
        </Pressable>
      </Link>
      <View style={styles.votes}>
        <VoteButtons carId={car.id} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.three },
  cover: { borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  coverText: { padding: Spacing.three },
  coverBrand: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
    letterSpacing: 1.5,
  },
  coverModel: { color: '#fff', fontSize: 22, lineHeight: 26, fontWeight: 700 },
  pill: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: { color: '#fff', fontSize: 11, lineHeight: 16, fontWeight: 700 },
  meta: { paddingTop: Spacing.two, paddingHorizontal: Spacing.one, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  price: { fontSize: 12, lineHeight: 16 },
  votes: { paddingTop: Spacing.two, paddingHorizontal: Spacing.one },
});
