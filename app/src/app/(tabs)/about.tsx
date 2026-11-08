import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, PrimaryButton, Section, Segmented } from '@/components/ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Lang } from '@/i18n/strings';
import { useAuth } from '@/store/auth';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, lang, setLang } = useI18n();
  const auth = useAuth();

  return (
    <ThemedView style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
        ]}>
        <ThemedText style={styles.title}>{t('aboutTitle')}</ThemedText>
        <ThemedText>{t('aboutBody')}</ThemedText>

        <Section title={t('principles')}>
          {(['principleNoAds', 'principleRealPrice', 'principleBadToo', 'principleVerified'] as const).map((k) => (
            <View key={k} style={styles.bullet}>
              <ThemedText style={{ color: theme.accent, fontWeight: 700 }}>✓</ThemedText>
              <ThemedText type="small" style={{ flex: 1 }}>
                {t(k)}
              </ThemedText>
            </View>
          ))}
        </Section>

        {auth.enabled && (
          <Section title={t('account')}>
            {auth.session ? (
              <View style={{ gap: Spacing.two, alignItems: 'flex-start' }}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('signedInAs')}: {auth.session.user.email}
                </ThemedText>
                <Chip label={t('signOut')} onPress={auth.signOut} />
                {auth.isModerator && (
                  <PrimaryButton label={`${t('moderation')} · ${t('openModeration')}`} onPress={() => router.push('/moderation')} />
                )}
              </View>
            ) : (
              <PrimaryButton label={t('signIn')} onPress={() => router.push('/sign-in')} />
            )}
          </Section>
        )}

        <Section title={t('language')}>
          <Segmented<Lang>
            value={lang}
            onChange={setLang}
            options={[
              { value: 'id', label: 'Bahasa Indonesia' },
              { value: 'tr', label: 'Türkçe' },
            ]}
          />
        </Section>

        {!auth.enabled && (
          <View style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('prototypeNote')}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, gap: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: 800 },
  bullet: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  note: { borderRadius: 14, padding: Spacing.three },
});
