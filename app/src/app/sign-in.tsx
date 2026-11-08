import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';

const MIN_PASSWORD = 8;

export default function SignInScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= MIN_PASSWORD && (mode === 'signIn' || name.trim().length >= 2);

  // Return to where the user came from; if the page was opened directly, go to the feed.
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    if (mode === 'signIn') {
      const err = await signIn(email, password);
      if (err) setError(err);
      else leave();
    } else {
      const { error: err, needsConfirmation } = await signUp(email, password, name);
      if (err) setError(err);
      else if (needsConfirmation) {
        setInfo(t('checkEmail'));
        setMode('signIn');
      } else leave();
    }
    setBusy(false);
  };

  const input = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: mode === 'signIn' ? t('signIn') : t('signUp') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <ThemedText style={styles.title}>{mode === 'signIn' ? t('signIn') : t('signUp')}</ThemedText>

          {mode === 'signUp' && (
            <View style={styles.field}>
              <ThemedText type="smallBold">{t('displayName')}</ThemedText>
              <TextInput value={name} onChangeText={setName} style={input} maxLength={40} autoComplete="nickname" />
              <ThemedText type="small" themeColor="textSecondary">
                {t('displayNameHint')}
              </ThemedText>
            </View>
          )}

          <View style={styles.field}>
            <ThemedText type="smallBold">{t('email')}</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold">{t('password')}</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={input}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            />
            {mode === 'signUp' && (
              <ThemedText type="small" themeColor="textSecondary">
                {t('passwordHint')}
              </ThemedText>
            )}
          </View>

          {error && (
            <ThemedText type="small" style={{ color: theme.negative }}>
              {error}
            </ThemedText>
          )}
          {info && (
            <ThemedText type="small" style={{ color: theme.positive }}>
              {info}
            </ThemedText>
          )}

          <PrimaryButton
            label={busy ? t('sending') : mode === 'signIn' ? t('signIn') : t('signUp')}
            onPress={submit}
            disabled={!valid || busy}
          />

          <Pressable
            onPress={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              setError(null);
            }}
            style={styles.switch}>
            <ThemedText type="small" style={{ color: theme.accent }}>
              {mode === 'signIn' ? t('noAccount') : t('haveAccount')}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: 800 },
  field: { gap: Spacing.one },
  input: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: 12, fontSize: 16 },
  switch: { alignSelf: 'center', paddingVertical: Spacing.two, maxWidth: MaxContentWidth },
});
