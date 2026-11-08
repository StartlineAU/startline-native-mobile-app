import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { authErrorMessage, isPasswordValid } from '@/lib/auth/errors';
import { colors, spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = (Array.isArray(params.email) ? params.email[0] : params.email) ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const request = async () => {
    setError('');
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await auth.forgotPassword(email.trim());
      setStep('reset');
      setMessage(`We sent a reset code to ${email.trim()}.`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setError('');
    if (code.trim().length < 6) {
      setError('Enter the reset code.');
      return;
    }
    if (!isPasswordValid(password)) {
      setError('Use 8+ characters with an uppercase letter, a lowercase letter and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(email.trim(), code, password);
      router.replace({ pathname: '/auth/sign-in', params: { email: email.trim() } } as Href);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Account recovery"
      title="Reset your"
      accent="password."
      subtitle={
        step === 'email'
          ? 'We will email you a code to set a new password.'
          : 'Enter the code and choose a new password.'
      }>
      <View style={styles.form}>
        <Field label="Email">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={step === 'email'}
            autoComplete="email"
            textContentType="emailAddress"
          />
        </Field>

        {step === 'reset' ? (
          <>
            <Field label="Reset code">
              <Input
                value={code}
                onChangeText={setCode}
                placeholder="000000"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
              />
            </Field>
            <Field label="New password">
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="New password"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
            </Field>
          </>
        ) : null}

        {message ? <AppText style={styles.success}>{message}</AppText> : null}
        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <Button
          label={step === 'email' ? 'Send reset code' : 'Set new password'}
          onPress={() => void (step === 'email' ? request() : reset())}
          loading={loading}
        />
        <Pressable onPress={() => router.replace('/auth/sign-in')}>
          <AppText variant="meta" style={styles.secondary}>
            Back to sign in
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
  success: {
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
