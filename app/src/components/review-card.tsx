import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Stars } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatIDR } from '@/lib/format';
import { useReviews } from '@/store/reviews';
import type { Review } from '@/types';

export function ReviewCard({ review }: { review: Review }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { myUserId } = useReviews();
  const mine = !!myUserId && review.userId === myUserId;
  const worthColor = review.worthIt === 'yes' ? 'positive' : review.worthIt === 'no' ? 'negative' : 'textSecondary';

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.row}>
            <ThemedText type="smallBold">{review.authorName}</ThemedText>
            {review.isDemo && <Badge label={t('demoBadge')} color="textSecondary" />}
            {mine && <Badge label={t('yourReview')} color="accent" />}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {review.modelYear}
            {review.variant ? ` · ${review.variant}` : ''} · {review.city} · {review.monthsOwned} {t('monthsOwned')}
          </ThemedText>
        </View>
        <Stars value={review.overall} />
      </View>

      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Badge label={t(`worth_${review.worthIt}`)} color={worthColor} />
        <Badge label={review.wouldBuyAgain ? t('buyAgainYes') : t('buyAgainNo')} color={review.wouldBuyAgain ? 'positive' : 'negative'} />
        <Badge
          label={`${t('paid')} ${formatIDR(review.pricePaidIDR)} · ${review.condition === 'new' ? t('newCar') : t('usedCar')}`}
          color="text"
        />
      </View>

      <ThemedText type="small">{review.body}</ThemedText>

      {review.pros.length > 0 && <PhraseList items={review.pros} sign="+" color={theme.positive} />}
      {review.cons.length > 0 && <PhraseList items={review.cons} sign="−" color={theme.negative} />}

      {review.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
          {review.photos.map((p, i) => (
            <View key={i} style={{ width: 140, gap: 4 }}>
              <Image
                source={{ uri: p.uri }}
                style={[styles.photo, { borderColor: p.sentiment === 'positive' ? theme.positive : theme.negative }]}
                contentFit="cover"
              />
              {!!p.caption && (
                <ThemedText style={{ fontSize: 12, lineHeight: 16 }} numberOfLines={2}>
                  {p.caption}
                </ThemedText>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {mine && (
        <Pressable
          onPress={() => router.push({ pathname: '/review/new', params: { reviewId: review.id } })}
          accessibilityRole="button"
          style={styles.editLink}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            ✎ {t('editMyReview')}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

function PhraseList({ items, sign, color }: { items: string[]; sign: string; color: string }) {
  return (
    <View style={{ gap: 2 }}>
      {items.map((p, i) => (
        <ThemedText key={i} type="small">
          <ThemedText type="smallBold" style={{ color }}>
            {sign}{' '}
          </ThemedText>
          {p}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  photo: { width: 140, height: 105, borderRadius: 10, borderWidth: 2 },
  editLink: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
});
