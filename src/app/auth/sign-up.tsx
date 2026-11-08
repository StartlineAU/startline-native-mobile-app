import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScaffold, SocialSignInButtons } from '@/components/auth/AuthScaffold';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { config } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { authErrorMessage, isAtLeast18, isPasswordValid } from '@/lib/auth/errors';
import { colors, spacing } from '@/theme/tokens';

export default function SignUpScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name.');
      return;
    }
    if (!isAtLeast18(dateOfBirth)) {
      setError('You must be at least 18 to create a Startline account.');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
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
    if (!accepted) {
      setError('Agree to the Terms of Service to continue.');
      return;
    }

    setLoading(true);
    try {
      await auth.signUp({
        email: email.trim(),
        password,
        name: `${firstName.trim()} ${lastName.trim()}`,
        dateOfBirth,
      });
      router.replace({
        pathname: '/auth/verify',
        params: { email: email.trim(), returnTo: returnTo ?? '' },
      } as Href);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const social = async (provider: 'google' | 'apple') => {
    setError('');
    setSocialLoading(true);
    try {
      const result = await auth.signInWithProvider(provider);
      if (result.done) router.replace((returnTo || '/') as Href);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSocialLoading(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="New athlete"
      title="Create your"
      accent="account."
      subtitle="One account for event discovery, entries and your race history.">
      <SocialSignInButtons onProvider={(provider) => void social(provider)} />

      <View style={styles.form}>
        <View style={styles.nameRow}>
          <View style={styles.flex}>
            <Field label="First name">
              <Input
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                autoComplete="given-name"
                textContentType="givenName"
              />
            </Field>
          </View>
          <View style={styles.flex}>
            <Field label="Last name">
              <Input
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                autoComplete="family-name"
                textContentType="familyName"
              />
            </Field>
          </View>
        </View>

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

        <Field label="Email">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </Field>

        <Field
          label="Password"
          hint="8+ characters with an uppercase letter, a lowercase letter and a number.">
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </Field>

        <Field label="Confirm password">
          <Input
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </Field>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          onPress={() => setAccepted((value) => !value)}
          style={styles.termsRow}>
          <View style={[styles.checkbox, accepted ? styles.checkboxActive : null]}>
            {accepted ? <Check size={13} color={colors.primaryInk} strokeWidth={3} /> : null}
          </View>
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
        </Pressable>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <Button
          label="Create account"
          onPress={() => void submit()}
          loading={loading || socialLoading}
        />
      </View>

      <View style={styles.footer}>
        <AppText variant="bodySmall">Already have an account?</AppText>
        <Pressable
          onPress={() =>
            router.replace({
              pathname: '/auth/sign-in',
              params: returnTo ? { returnTo } : {},
            } as Href)
          }>
          <AppText variant="label" style={styles.link}>
            Sign in
          </AppText>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: { flex: 1 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  termsText: {
    flex: 1,
    lineHeight: 19,
  },
  link: {
    color: colors.primary,
  },
  error: {
    color: colors.danger,
  },
  footer: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
