import { Link, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, Chip } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { fetchPendingReports, hideReview, resolveReports, type PendingReview, type ReportReason } from '@/lib/moderation';
import { useAuth } from '@/store/auth';
import { useCatalog } from '@/store/catalog';
import { useReviews } from '@/store/reviews';

/**
 * Moderator inbox: reported reviews, most-reported first.
 * "Hide" takes a review out of the public app (the author still sees it); "Dismiss" keeps it.
 * The database refuses all of this for non-moderators, the check here is only for display.
 */
export default function ModerationScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const auth = useAuth();
  const { getCar } = useCatalog();
  const { reload: reloadReviews } = useReviews();
  const [items, setItems] = useState<PendingReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await fetchPendingReports();
    setItems(result.items);
    setError(result.error ?? null);
  }, []);

  useEffect(() => {
    if (auth.isModerator) load();
  }, [auth.isModerator, load]);

  const act = async (item: PendingReview, action: 'hide' | 'dismiss') => {
    setBusy(item.reviewId);
    const err = action === 'hide' ? await hideReview(item) : await resolveReports(item);
    setBusy(null);
    if (err) setError(err);
    else {
      setItems((prev) => prev?.filter((i) => i.reviewId !== item.reviewId) ?? null);
      if (action === 'hide') reloadReviews();
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: t('moderation') }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.six }]}>
        {!auth.isModerator ? (
          <ThemedText>{t('moderatorOnly')}</ThemedText>
        ) : items === null ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('loading')}
          </ThemedText>
        ) : (
          <>
            {error && (
              <ThemedText type="small" style={{ color: theme.negative }}>
                {error}
              </ThemedText>
            )}
            {items.length === 0 && <ThemedText>{t('noReports')}</ThemedText>}
            {items.map((item) => {
              const car = getCar(item.carId);
              return (
                <View key={item.reviewId} style={[styles.card, { borderColor: theme.border }]}>
                  <View style={styles.row}>
                    <Badge label={`${item.total} ${t('reportsFor')}`} color="negative" />
                    {item.status === 'hidden' && <Badge label={t('hideReview')} color="textSecondary" />}
                  </View>
                  <Link href={{ pathname: '/car/[id]', params: { id: item.carId } }}>
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      {car ? `${car.brand} ${car.model}` : item.carId}
                    </ThemedText>
                  </Link>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.authorName}
                  </ThemedText>
                  <ThemedText type="small">{item.body}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {(Object.entries(item.reasons) as [ReportReason, number][]).map(([r, n]) => `${t(`reason_${r}`)} ×${n}`).join(' · ')}
                  </ThemedText>
                  <View style={styles.row}>
                    <Chip label={t('hideReview')} tone="negative" selected onPress={busy ? undefined : () => act(item, 'hide')} />
                    <Chip label={t('dismissReports')} onPress={busy ? undefined : () => act(item, 'dismiss')} />
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
});
