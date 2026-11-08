import { router, useLocalSearchParams, type Href } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { authErrorMessage } from '@/lib/auth/errors';
import { colors, radius, spacing } from '@/theme/tokens';

export default function VerifyEmailScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ email?: string; returnTo?: string }>();
  const email = (Array.isArray(params.email) ? params.email[0] : params.email) ?? '';
  const returnTo = (Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo) ?? '/';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const confirm = async () => {
    setError('');
    if (code.trim().length < 6) {
      setError('Enter the full verification code.');
      return;
    }
    setLoading(true);
    try {
      const result = await auth.confirmSignUp(email, code);
      if (result.done) {
        router.replace(returnTo as Href);
      } else if (result.challenge === 'reset_password') {
        router.replace({ pathname: '/auth/sign-in', params: { email } } as Href);
      } else {
        setError('Email verified. Sign in to continue.');
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setMessage('');
    setResending(true);
    try {
      await auth.resendVerification(email);
      setMessage('A new code is on its way.');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Email verification"
      title="Check your"
      accent="inbox."
      subtitle={`Enter the six-digit code sent to ${email || 'your email address'}.`}>
      <View style={styles.iconWrap}>
        <MailCheck size={26} color={colors.primary} />
      </View>

      <View style={styles.form}>
        <Field label="Verification code">
          <Input
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
          />
        </Field>
        {message ? <AppText style={styles.success}>{message}</AppText> : null}
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button label="Verify email" onPress={() => void confirm()} loading={loading} />
        <Pressable onPress={() => void resend()} disabled={resending}>
          <AppText variant="meta" style={styles.link}>
            {resending ? 'Sending a new code…' : 'Resend code'}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => router.replace({ pathname: '/auth/sign-in', params: { email } } as Href)}>
          <AppText variant="meta" style={styles.secondary}>
            Back to sign in
          </AppText>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    marginTop: spacing.xxl,
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  success: {
    color: colors.primary,
  },
  error: {
    color: colors.danger,
  },
  link: {
    color: colors.primary,
    textAlign: 'center',
  },
  secondary: {
    color: colors.muted,
    textAlign: 'center',
  },
});
