import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, PrimaryButton, Section, Segmented, StarInput } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { compressPhoto } from '@/lib/images';
import type { StringKey } from '@/i18n/strings';
import { useAuth } from '@/store/auth';
import { useCatalog } from '@/store/catalog';
import { useReviews } from '@/store/reviews';
import { ASPECTS, type Aspect, type ReviewPhoto, type WorthIt } from '@/types';

const MIN_BODY = 30;
const CURRENT_YEAR = new Date().getFullYear();

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export default function NewReviewScreen() {
  const params = useLocalSearchParams<{ carId?: string; reviewId?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { addReview, updateReview, deleteReview, reviews, myUserId } = useReviews();
  const { cars, getCar } = useCatalog();
  const auth = useAuth();
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [carId, setCarId] = useState<string | undefined>(params.carId);
  const [modelYear, setModelYear] = useState('');
  const [variant, setVariant] = useState('');
  const [condition, setCondition] = useState<'new' | 'used'>('new');
  const [priceMillions, setPriceMillions] = useState('');
  const [city, setCity] = useState('');
  const [monthsOwned, setMonthsOwned] = useState('');
  const [overall, setOverall] = useState(0);
  const [aspects, setAspects] = useState<Record<Aspect, number>>({ buildQuality: 0, comfort: 0, fuel: 0, afterSales: 0 });
  const [worthIt, setWorthIt] = useState<WorthIt>();
  const [buyAgain, setBuyAgain] = useState<'yes' | 'no'>();
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // Edit mode: opened from "edit my review", or the user picked a car they already reviewed.
  const editing =
    reviews.find((r) => r.id === params.reviewId && r.userId === myUserId) ??
    (myUserId ? reviews.find((r) => r.carId === carId && r.userId === myUserId) : undefined);

  useEffect(() => {
    if (!editing) return;
    setCarId(editing.carId);
    setModelYear(String(editing.modelYear));
    setVariant(editing.variant ?? '');
    setCondition(editing.condition);
    setPriceMillions(String(editing.pricePaidIDR / 1_000_000).replace('.', ','));
    setCity(editing.city === '—' ? '' : editing.city);
    setMonthsOwned(editing.monthsOwned ? String(editing.monthsOwned) : '');
    setOverall(editing.overall);
    setAspects(editing.aspects);
    setWorthIt(editing.worthIt);
    setBuyAgain(editing.wouldBuyAgain ? 'yes' : 'no');
    setPros(editing.pros.join('\n'));
    setCons(editing.cons.join('\n'));
    setBody(editing.body);
    setPhotos(editing.photos);
    // Only when a different review is loaded, so the user's edits aren't overwritten on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  const year = parseInt(modelYear, 10);
  const price = parseFloat(priceMillions.replace(',', '.'));
  const missing: StringKey[] = [];
  if (!getCar(carId)) missing.push('formCar');
  if (!(year >= 1980 && year <= CURRENT_YEAR + 1)) missing.push('formModelYear');
  if (!(price > 0)) missing.push('formPricePaid');
  if (!overall) missing.push('formOverall');
  if (ASPECTS.some((a) => !aspects[a])) missing.push('formAspects');
  if (!worthIt) missing.push('formWorthIt');
  if (!buyAgain) missing.push('formBuyAgain');
  if (body.trim().length < MIN_BODY) missing.push('formBody');

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });
    if (result.canceled) return;
    setCompressing(true);
    const uris = await Promise.all(result.assets.map((a) => compressPhoto(a.uri, a.width, a.height)));
    setCompressing(false);
    setPhotos((prev) => [...prev, ...uris.map((uri) => ({ uri, caption: '', sentiment: 'negative' as const }))].slice(0, 6));
  };

  const updatePhoto = (i: number, patch: Partial<ReviewPhoto>) =>
    setPhotos((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const submit = async () => {
    if (missing.length > 0 || !carId || !worthIt || sending) return;
    setSending(true);
    setSubmitError(null);
    const input = {
      carId,
      modelYear: year,
      variant: variant.trim() || undefined,
      pricePaidIDR: Math.round(price * 1_000_000),
      condition,
      city: city.trim() || '—',
      monthsOwned: parseInt(monthsOwned, 10) || 0,
      overall,
      aspects,
      worthIt,
      wouldBuyAgain: buyAgain === 'yes',
      pros: lines(pros),
      cons: lines(cons),
      body: body.trim(),
      photos: photos.map((p) => ({ ...p, caption: p.caption.trim() })),
    };
    const result = editing ? await updateReview(editing.id, input) : await addReview(input, t('you'));
    setSending(false);
    if (!result.ok) {
      setSubmitError(
        t(result.error === 'alreadyReviewed' ? 'alreadyReviewed' : 'saveFailed') + (result.detail ? `\n(${result.detail})` : ''),
      );
      return;
    }
    router.dismissTo({ pathname: '/car/[id]', params: { id: carId } });
  };

  const remove = async () => {
    if (!editing || sending) return;
    setSending(true);
    const result = await deleteReview(editing.id);
    setSending(false);
    if (!result.ok) {
      setSubmitError(t('saveFailed') + (result.detail ? `\n(${result.detail})` : ''));
      return;
    }
    router.dismissTo({ pathname: '/car/[id]', params: { id: editing.carId } });
  };

  // An account is required once a server is connected: one account, one review per car.
  if (auth.enabled && !auth.session) {
    return (
      <ThemedView style={[styles.flex, styles.gate]}>
        <Stack.Screen options={{ title: t('formTitle') }} />
        <ThemedText style={{ textAlign: 'center' }}>{t('signInToReview')}</ThemedText>
        <PrimaryButton label={t('signIn')} onPress={() => router.push('/sign-in')} disabled={auth.loading} />
      </ThemedView>
    );
  }

  const selectedCar = getCar(carId);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: editing ? t('editReviewTitle') : t('formTitle') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.six }]}>
          {editing && !params.reviewId && (
            <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">{t('editNotice')}</ThemedText>
            </View>
          )}
          <Section title={t('formCar')}>
            {selectedCar && (params.carId || editing) ? (
              <ThemedText type="smallBold">
                {selectedCar.brand} {selectedCar.model}
              </ThemedText>
            ) : (
              <View style={styles.wrap}>
                {cars.map((c) => (
                  <Chip key={c.id} label={`${c.brand} ${c.model}`} selected={c.id === carId} onPress={() => setCarId(c.id)} />
                ))}
              </View>
            )}
          </Section>

          <View style={styles.twoCols}>
            <Field
              label={t('formModelYear')}
              value={modelYear}
              onChangeText={setModelYear}
              keyboardType="number-pad"
              placeholder={`${CURRENT_YEAR - 1}`}
              maxLength={4}
              half
            />
            <Field label={t('formVariant')} value={variant} onChangeText={setVariant} placeholder="2.0 V HV" half />
          </View>

          <Section title={t('formCondition')} style={styles.tight}>
            <Segmented
              value={condition}
              onChange={setCondition}
              options={[
                { value: 'new', label: t('newCar') },
                { value: 'used', label: t('usedCar') },
              ]}
            />
          </Section>

          <Field
            label={t('formPricePaid')}
            value={priceMillions}
            onChangeText={setPriceMillions}
            keyboardType="decimal-pad"
            placeholder="450"
          />
          <View style={styles.twoCols}>
            <Field label={t('formCity')} value={city} onChangeText={setCity} placeholder="Jakarta" half />
            <Field
              label={t('formMonthsOwned')}
              value={monthsOwned}
              onChangeText={setMonthsOwned}
              keyboardType="number-pad"
              placeholder="12"
              half
            />
          </View>

          <Section title={t('formOverall')} style={styles.tight}>
            <StarInput value={overall} onChange={setOverall} />
          </Section>

          <Section title={t('formAspects')} style={styles.tight}>
            {ASPECTS.map((a) => (
              <View key={a} style={styles.aspectRow}>
                <ThemedText type="small" style={styles.flex}>
                  {t(`aspect_${a}`)}
                </ThemedText>
                <StarInput value={aspects[a]} onChange={(v) => setAspects((prev) => ({ ...prev, [a]: v }))} />
              </View>
            ))}
          </Section>

          <Section title={t('formWorthIt')} style={styles.tight}>
            <Segmented
              value={worthIt}
              onChange={setWorthIt}
              options={[
                { value: 'yes', label: t('worth_yes'), tone: 'positive' },
                { value: 'unsure', label: t('worth_unsure') },
                { value: 'no', label: t('worth_no'), tone: 'negative' },
              ]}
            />
          </Section>

          <Section title={t('formBuyAgain')} style={styles.tight}>
            <Segmented
              value={buyAgain}
              onChange={setBuyAgain}
              options={[
                { value: 'yes', label: t('yes'), tone: 'positive' },
                { value: 'no', label: t('no'), tone: 'negative' },
              ]}
            />
          </Section>

          <Field label={t('formPros')} value={pros} onChangeText={setPros} multiline />
          <Field label={t('formCons')} value={cons} onChangeText={setCons} multiline />
          <Field
            label={t('formBody')}
            hint={`${t('formBodyHint')} (${body.trim().length}/${MIN_BODY})`}
            value={body}
            onChangeText={setBody}
            multiline
            style={{ minHeight: 120 }}
          />

          <Section title={t('formPhotos')} style={styles.tight}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('formPhotosHint')}
            </ThemedText>
            {photos.map((p, i) => (
              <View key={p.uri + i} style={[styles.photoRow, { borderColor: theme.border }]}>
                <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
                <View style={[styles.flex, { gap: Spacing.two }]}>
                  <Segmented
                    value={p.sentiment}
                    onChange={(s) => updatePhoto(i, { sentiment: s })}
                    options={[
                      { value: 'positive', label: t('photoPositive'), tone: 'positive' },
                      { value: 'negative', label: t('photoNegative'), tone: 'negative' },
                    ]}
                  />
                  <TextInput
                    value={p.caption}
                    onChangeText={(caption) => updatePhoto(i, { caption })}
                    placeholder={t('formPhotoCaption')}
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                  />
                  <Pressable onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}>
                    <ThemedText type="small" style={{ color: theme.negative }}>
                      {t('remove')}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))}
            {photos.length < 6 && (
              <Chip label={compressing ? t('loading') : t('formAddPhoto')} onPress={compressing ? undefined : pickPhoto} />
            )}
          </Section>

          {missing.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {t('missingFields')}: {missing.map((k) => t(k)).join(' · ')}
            </ThemedText>
          )}
          {submitError && (
            <ThemedText type="small" style={{ color: theme.negative }}>
              {submitError}
            </ThemedText>
          )}
          <PrimaryButton
            label={sending ? t('sending') : editing ? t('saveChanges') : t('submit')}
            onPress={submit}
            disabled={missing.length > 0 || sending || compressing}
          />

          {editing &&
            (confirmDelete ? (
              <View style={[styles.notice, { borderColor: theme.negative, borderWidth: 1 }]}>
                <ThemedText type="small">{t('deleteConfirm')}</ThemedText>
                <View style={styles.wrap}>
                  <Chip label={t('deleteYes')} tone="negative" selected onPress={remove} />
                  <Chip label={t('cancel')} onPress={() => setConfirmDelete(false)} />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmDelete(true)} style={styles.deleteLink} accessibilityRole="button">
                <ThemedText type="small" style={{ color: theme.negative }}>
                  {t('deleteReview')}
                </ThemedText>
              </Pressable>
            ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function Field({ label, hint, style, half, ...props }: TextInputProps & { label: string; hint?: string; half?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[half && styles.flex, { gap: Spacing.one }]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        textAlignVertical={props.multiline ? 'top' : 'center'}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }, props.multiline && { minHeight: 80 }, style]}
        {...props}
      />
      {hint && (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  tight: { gap: Spacing.two },
  notice: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  deleteLink: { alignSelf: 'center', paddingVertical: Spacing.two },
  gate: { padding: Spacing.four, gap: Spacing.four, justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  twoCols: { flexDirection: 'row', gap: Spacing.three },
  aspectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: 10, fontSize: 16 },
  photoRow: { flexDirection: 'row', gap: Spacing.three, borderWidth: 1, borderRadius: 14, padding: Spacing.two },
  thumb: { width: 96, height: 96, borderRadius: 10 },
});
