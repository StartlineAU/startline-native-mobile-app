import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScaffold, SignInFields, SocialSignInButtons } from '@/components/auth/AuthScaffold';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { authErrorMessage, mfaSecretFromUri } from '@/lib/auth/errors';
import { colors, radius, spacing } from '@/theme/tokens';
import type { ChallengeType } from '@/lib/auth/service';

export default function SignInScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ returnTo?: string; email?: string }>();
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const initialEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<ChallengeType | null>(null);
  const [challengeValue, setChallengeValue] = useState('');
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const destination = returnTo || '/';

  const finish = () => {
    router.replace(destination as Href);
  };

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await auth.signIn(email, password);
      if (result.done) {
        finish();
        return;
      }
      if (result.challenge === 'email_verification') {
        router.replace({
          pathname: '/auth/verify',
          params: { email: email.trim() },
        } as Href);
        return;
      }
      if (result.challenge === 'reset_password') {
        router.replace({
          pathname: '/auth/forgot-password',
          params: { email: email.trim() },
        } as Href);
        return;
      }
      setChallenge(result.challenge ?? null);
      setSetupUri(result.setupUri ?? null);
      setChallengeValue('');
    } catch (err) {
      if (__DEV__) {
        const detail = err as { name?: string; message?: string; underlyingError?: unknown; cause?: unknown };
        console.warn('Sign-in failed', {
          name: detail?.name,
          message: detail?.message,
          underlyingError: detail?.underlyingError,
          cause: detail?.cause,
        });
      }
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitChallenge = async () => {
    if (!challenge) return;
    setError('');
    if (!challengeValue.trim()) {
      setError('Enter the code to continue.');
      return;
    }
    setLoading(true);
    try {
      const result = await auth.confirmChallenge(challenge, challengeValue.trim());
      if (result.done) {
        finish();
        return;
      }
      setChallenge(result.challenge ?? challenge);
      setSetupUri(result.setupUri ?? setupUri);
      setChallengeValue('');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const selectTotp = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await auth.confirmChallenge('mfa_select', 'TOTP');
      setChallenge(result.challenge ?? 'totp');
      setSetupUri(result.setupUri ?? null);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const social = async (provider: 'google' | 'apple') => {
    setError('');
    setLoading(true);
    try {
      const result = await auth.signInWithProvider(provider);
      if (result.done) finish();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (challenge) {
    const secret = mfaSecretFromUri(setupUri);
    return (
      <AuthScaffold
        eyebrow="Account security"
        title="One more"
        accent="check."
        subtitle={
          challenge === 'new_password'
            ? 'Cognito requires a new password before this sign-in can continue.'
            : challenge === 'mfa_select'
              ? 'Choose how you want to verify this sign-in.'
              : challenge === 'totp_setup'
                ? 'Add Startline to your authenticator app, then enter the six-digit code.'
                : 'Enter the six-digit code from your authenticator app.'
        }>
        <View style={styles.challengeCard}>
          <ShieldCheck size={24} color={colors.primary} />
          {secret ? (
            <View style={styles.secretBlock}>
              <AppText variant="meta">Manual setup key</AppText>
              <AppText variant="heading" selectable style={styles.secret}>
                {secret}
              </AppText>
            </View>
          ) : null}
          {challenge === 'mfa_select' ? (
            <Button label="Use authenticator app" onPress={() => void selectTotp()} loading={loading} />
          ) : (
            <>
              <Field label={challenge === 'new_password' ? 'New password' : 'Authenticator code'}>
                <Input
                  value={challengeValue}
                  onChangeText={setChallengeValue}
                  placeholder={challenge === 'new_password' ? 'New password' : '000000'}
                  secureTextEntry={challenge === 'new_password'}
                  keyboardType={challenge === 'new_password' ? 'default' : 'number-pad'}
                  autoComplete={challenge === 'new_password' ? 'new-password' : 'one-time-code'}
                  textContentType={challenge === 'new_password' ? 'newPassword' : 'oneTimeCode'}
                  maxLength={challenge === 'new_password' ? undefined : 6}
                  autoFocus
                />
              </Field>
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <Button label="Continue" onPress={() => void submitChallenge()} loading={loading} />
            </>
          )}
          <Pressable
            onPress={() => {
              setChallenge(null);
              setChallengeValue('');
              setError('');
            }}>
            <AppText variant="meta" style={styles.secondaryAction}>
              Use a different account
            </AppText>
          </Pressable>
        </View>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      eyebrow="Athlete account"
      title="Welcome"
      accent="back."
      subtitle="Sign in to save events, register and keep track of your race calendar.">
      <SocialSignInButtons onProvider={(provider) => void social(provider)} />
      <SignInFields
        email={email}
        onEmail={setEmail}
        password={password}
        onPassword={setPassword}
      />

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/auth/forgot-password',
            params: email ? { email } : {},
          } as Href)
        }
        style={styles.forgot}>
        <AppText variant="meta" style={styles.link}>
          Forgot password?
        </AppText>
      </Pressable>

      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      <Button
        testID="sign-in-submit"
        label="Sign in"
        onPress={() => void submit()}
        loading={loading}
        style={styles.submit}
      />

      <View style={styles.footer}>
        <AppText variant="bodySmall">New to Startline?</AppText>
        <Pressable
          onPress={() =>
            router.replace({
              pathname: '/auth/sign-up',
              params: returnTo ? { returnTo } : {},
            } as Href)
          }>
          <AppText variant="label" style={styles.link}>
            Create an account
          </AppText>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    marginTop: -spacing.sm,
  },
  link: {
    color: colors.primary,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
  },
  submit: {
    marginTop: spacing.lg,
  },
  footer: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  challengeCard: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.lg,
  },
  secretBlock: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  secret: {
    letterSpacing: 1.8,
  },
  secondaryAction: {
    alignSelf: 'center',
    color: colors.muted,
  },
});
