import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/strings';
import { useAuth } from '@/store/auth';

const MIN_PASSWORD = 8;
const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);

/**
 * signIn / signUp: the usual forms.
 * resetRequest → resetConfirm: "forgot password". A 6–8 digit code is emailed; typing it here
 * (instead of tapping a link) works the same in Expo Go, a store build and the browser.
 */
type Mode = 'signIn' | 'signUp' | 'resetRequest' | 'resetConfirm';

const TITLES: Record<Mode, StringKey> = {
  signIn: 'signIn',
  signUp: 'signUp',
  resetRequest: 'resetTitle',
  resetConfirm: 'resetTitle',
};

export default function SignInScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { signIn, signUp, sendResetCode, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    if (next !== 'resetConfirm') setInfo(null);
  };

  // Return to where the user came from; if the page was opened directly, go to the feed.
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const valid = {
    signIn: isEmail(email) && password.length >= MIN_PASSWORD,
    signUp: isEmail(email) && password.length >= MIN_PASSWORD && name.trim().length >= 2,
    resetRequest: isEmail(email),
    resetConfirm: /^\d{6,8}$/.test(code.trim()) && password.length >= MIN_PASSWORD,
  }[mode];

  const submit = async () => {
    setBusy(true);
    setError(null);
    if (mode === 'signIn') {
      const err = await signIn(email, password);
      if (err) setError(err);
      else leave();
    } else if (mode === 'signUp') {
      const { error: err, needsConfirmation } = await signUp(email, password, name);
      if (err) setError(err);
      else if (needsConfirmation) {
        setInfo(t('checkEmail'));
        switchTo('signIn');
      } else leave();
    } else if (mode === 'resetRequest') {
      const err = await sendResetCode(email);
      if (err) setError(err);
      else {
        setPassword('');
        setInfo(t('codeSent'));
        switchTo('resetConfirm');
      }
    } else {
      const err = await resetPassword(email, code, password);
      if (err) setError(err);
      else leave(); // the code signed the user in and the new password is saved
    }
    setBusy(false);
  };

  const buttonLabel = { signIn: t('signIn'), signUp: t('signUp'), resetRequest: t('sendCode'), resetConfirm: t('setNewPassword') }[mode];

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: t(TITLES[mode]) }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <ThemedText style={styles.title}>{t(TITLES[mode])}</ThemedText>
          {mode === 'resetRequest' && <ThemedText type="small">{t('resetIntro')}</ThemedText>}

          {mode === 'signUp' && (
            <Field
              label={t('displayName')}
              hint={t('displayNameHint')}
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoComplete="nickname"
            />
          )}

          {mode !== 'resetConfirm' && (
            <Field
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
          )}

          {mode === 'resetConfirm' && (
            <Field
              label={t('code')}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={8}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              style={styles.code}
            />
          )}

          {mode !== 'resetRequest' && (
            <Field
              label={mode === 'resetConfirm' ? t('newPassword') : t('password')}
              hint={mode === 'signIn' ? undefined : t('passwordHint')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            />
          )}

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

          <PrimaryButton label={busy ? t('sending') : buttonLabel} onPress={submit} disabled={!valid || busy} />

          {mode === 'signIn' && <LinkButton label={t('forgotPassword')} onPress={() => switchTo('resetRequest')} />}
          {mode === 'signIn' && <LinkButton label={t('noAccount')} onPress={() => switchTo('signUp')} />}
          {mode === 'signUp' && <LinkButton label={t('haveAccount')} onPress={() => switchTo('signIn')} />}
          {(mode === 'resetRequest' || mode === 'resetConfirm') && (
            <LinkButton label={t('backToSignIn')} onPress={() => switchTo('signIn')} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function Field({ label, hint, style, ...props }: TextInputProps & { label: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }, style]} {...props} />
      {hint && (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      )}
    </View>
  );
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.link} accessibilityRole="button">
      <ThemedText type="small" style={{ color: theme.accent }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: 800 },
  field: { gap: Spacing.one },
  input: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: 12, fontSize: 16 },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  link: { alignSelf: 'center', paddingVertical: Spacing.one },
});
