import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReviewCard } from '@/components/review-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AspectBar, PrimaryButton, Section, StatTile } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getCar } from '@/data/cars';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatIDR, formatIDRRange, percent } from '@/lib/format';
import { summarize } from '@/lib/stats';
import { useCarReviews } from '@/store/reviews';
import { ASPECTS } from '@/types';

export default function CarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const car = getCar(id);
  const reviews = useCarReviews(id);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  if (!car) {
    return (
      <ThemedView style={[styles.flex, styles.center]}>
        <ThemedText>404</ThemedText>
      </ThemedView>
    );
  }

  const summary = summarize(reviews);
  const photos = reviews.flatMap((r) => r.photos);
  const goWrite = () => router.push({ pathname: '/review/new', params: { carId: car.id } });

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: `${car.brand} ${car.model}` }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.six }]}>
        <View style={[styles.hero, { backgroundColor: car.tint }]}>
          <ThemedText style={styles.heroBrand}>{car.brand.toUpperCase()}</ThemedText>
          <ThemedText style={styles.heroModel}>{car.model}</ThemedText>
          <ThemedText style={styles.heroMeta}>
            {t(`bodyType_${car.bodyType}`)} · {car.generation}
          </ThemedText>
        </View>

        {summary ? (
          <>
            <View style={styles.tiles}>
              <StatTile value={summary.avgOverall.toFixed(1)} label={t('overallScore')} />
              <StatTile value={percent(summary.worthYes)} label={t('worthTheMoney')} color={summary.worthYes >= 0.5 ? 'positive' : 'negative'} />
              <StatTile value={percent(summary.buyAgain)} label={t('wouldBuyAgain')} color={summary.buyAgain >= 0.5 ? 'positive' : 'negative'} />
            </View>

            <Section title={t('ownersPaid')}>
              <View style={[styles.priceBox, { backgroundColor: theme.backgroundElement }]}>
                <PriceRow label={t('average')} value={formatIDR(summary.avgPaidIDR)} bold />
                <PriceRow label={t('range')} value={formatIDRRange(summary.minPaidIDR, summary.maxPaidIDR)} />
                <PriceRow label={t('newPriceRange')} value={formatIDRRange(car.priceMinIDR, car.priceMaxIDR)} />
              </View>
            </Section>

            <Section title={`${summary.count} ${t('reviews')}`}>
              {ASPECTS.map((a) => (
                <AspectBar key={a} label={t(`aspect_${a}`)} value={summary.aspects[a]} />
              ))}
            </Section>

            <View style={styles.prosCons}>
              <PhraseBlock title={t('whatOwnersLike')} items={summary.topPros} color={theme.positive} sign="+" />
              <PhraseBlock title={t('whatOwnersDislike')} items={summary.topCons} color={theme.negative} sign="−" />
            </View>

            {photos.length > 0 && (
              <Section title={t('ownerPhotos')}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
                  {photos.map((p, i) => (
                    <Image
                      key={i}
                      source={{ uri: p.uri }}
                      style={[styles.photo, { borderColor: p.sentiment === 'positive' ? theme.positive : theme.negative }]}
                      contentFit="cover"
                    />
                  ))}
                </ScrollView>
              </Section>
            )}

            <PrimaryButton label={t('writeReviewForThis')} onPress={goWrite} />

            <Section title={t('ownerReviews')}>
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </Section>
          </>
        ) : (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">{t('noReviewsYet')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('beFirst')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('newPriceRange')}: {formatIDRRange(car.priceMinIDR, car.priceMaxIDR)}
            </ThemedText>
            <PrimaryButton label={t('writeReviewForThis')} onPress={goWrite} />
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
        {label}
      </ThemedText>
      <ThemedText type={bold ? 'smallBold' : 'small'}>{value}</ThemedText>
    </View>
  );
}

function PhraseBlock({ title, items, color, sign }: { title: string; items: { text: string; count: number }[]; color: string; sign: string }) {
  if (items.length === 0) return null;
  return (
    <Section title={title} style={{ gap: Spacing.two }}>
      {items.map((p) => (
        <ThemedText key={p.text} type="small">
          <ThemedText type="smallBold" style={{ color }}>
            {sign}{' '}
          </ThemedText>
          {p.text}
          {p.count > 1 && <ThemedText type="small" themeColor="textSecondary">{`  ×${p.count}`}</ThemedText>}
        </ThemedText>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, gap: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  hero: { borderRadius: 24, padding: Spacing.four, paddingTop: Spacing.six, gap: 2 },
  heroBrand: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 16, fontWeight: 700, letterSpacing: 2 },
  heroModel: { color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: 800 },
  heroMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  priceBox: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  prosCons: { gap: Spacing.four },
  photo: { width: 160, height: 120, borderRadius: 12, borderWidth: 2 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: Spacing.four, gap: Spacing.two },
});
