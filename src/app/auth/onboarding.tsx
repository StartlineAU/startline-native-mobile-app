import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { AgreementCheckbox } from '@/components/ui/AgreementCheckbox';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { config } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { authErrorMessage, isAtLeast18 } from '@/lib/auth/errors';
import { colors, spacing } from '@/theme/tokens';

export default function OnboardingScreen() {
  const auth = useAuth();
  const [dateOfBirth, setDateOfBirth] = useState(auth.profile?.dateOfBirth ?? '');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!isAtLeast18(dateOfBirth)) {
      setError('You must be at least 18 to use Startline.');
      return;
    }
    if (!accepted) {
      setError('Agree to the Terms of Service to continue.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/api/user/profile', {
        method: 'PUT',
        auth: 'required',
        body: { dateOfBirth },
      });
      await auth.completeOnboarding();
      router.replace('/');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Before you start"
      title="One last"
      accent="step."
      subtitle="Startline needs your date of birth and agreement to the platform terms.">
      <View style={styles.form}>
        <Field label="Date of birth" hint="Use YYYY-MM-DD. You must be 18 or older.">
          <Input
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="1995-08-24"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoComplete="birthdate-full"
            textContentType="birthdate"
          />
        </Field>

        <AgreementCheckbox
          testID="onboarding-terms-checkbox"
          checked={accepted}
          onChange={setAccepted}>
          <AppText variant="bodySmall" style={styles.termsText}>
            I agree to the Startline{' '}
            <AppText
              variant="bodySmall"
              style={styles.link}
              onPress={() => void WebBrowser.openBrowserAsync(config.termsUrl)}>
              Terms of Service
            </AppText>{' '}
            and{' '}
            <AppText
              variant="bodySmall"
              style={styles.link}
              onPress={() => void WebBrowser.openBrowserAsync(config.privacyUrl)}>
              Privacy Policy
            </AppText>
            .
          </AppText>
        </AgreementCheckbox>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button
          testID="onboarding-submit"
          label="Enter Startline"
          onPress={() => void submit()}
          loading={loading}
        />
        <Pressable onPress={() => void auth.signOut().then(() => router.replace('/auth/sign-in'))}>
          <AppText variant="meta" style={styles.secondary}>
            Sign out
          </AppText>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  termsText: {
    lineHeight: 19,
    paddingTop: 1,
  },
  link: {
    color: colors.primary,
  },
  error: {
    color: colors.danger,
  },
  secondary: {
    color: colors.muted,
    textAlign: 'center',
  },
});
