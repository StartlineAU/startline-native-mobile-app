import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { ArrowLeft, Lock, Mail } from 'lucide-react-native';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { config } from '@/config/env';
import { colors, spacing } from '@/theme/tokens';

export function AuthScaffold({
  title,
  accent,
  eyebrow,
  subtitle,
  children,
  backTo,
}: {
  title: string;
  accent?: string;
  eyebrow: string;
  subtitle?: string;
  children: React.ReactNode;
  backTo?: string;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              onPress={() =>
                backTo
                  ? router.replace(backTo as Href)
                  : router.canGoBack()
                    ? router.back()
                    : router.replace('/')
              }
              style={styles.back}>
              <ArrowLeft size={20} color={colors.text} />
            </Pressable>
            <Image
              source={require('@/assets/images/startline-title-white.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          <View style={styles.heading}>
            <AppText variant="eyebrow">{eyebrow}</AppText>
            <AppText variant="displayItalic" style={styles.title}>
              {title}
              {accent ? (
                <>
                  {'\n'}
                  <AppText variant="displayItalic" style={styles.accent}>
                    {accent}
                  </AppText>
                </>
              ) : null}
            </AppText>
            {subtitle ? (
              <AppText variant="body" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function SocialSignInButtons({ onProvider }: { onProvider: (provider: 'google' | 'apple') => void }) {
  if (config.socialProviders.length === 0) return null;
  return (
    <View style={styles.social}>
      <View style={styles.orRow}>
        <View style={styles.line} />
        <AppText variant="meta">or continue with</AppText>
        <View style={styles.line} />
      </View>
      {config.socialProviders.map((provider) => (
        <Button
          key={provider}
          label={provider === 'google' ? 'Continue with Google' : 'Continue with Apple'}
          variant="outline"
          onPress={() => onProvider(provider)}
        />
      ))}
    </View>
  );
}

export function SignInFields({
  email,
  onEmail,
  password,
  onPassword,
  emailError,
  passwordError,
}: {
  email: string;
  onEmail: (value: string) => void;
  password: string;
  onPassword: (value: string) => void;
  emailError?: string;
  passwordError?: string;
}) {
  return (
    <View style={styles.fields}>
      <Field label="Email" error={emailError}>
        <View style={styles.inputWrap}>
          <Mail size={17} color={colors.mutedDark} style={styles.inputIcon} />
          <Input
            value={email}
            onChangeText={onEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            autoComplete="email"
            style={styles.inputWithIcon}
          />
        </View>
      </Field>
      <Field label="Password" error={passwordError}>
        <View style={styles.inputWrap}>
          <Lock size={17} color={colors.mutedDark} style={styles.inputIcon} />
          <Input
            value={password}
            onChangeText={onPassword}
            placeholder="Your password"
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            style={styles.inputWithIcon}
          />
        </View>
      </Field>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  topBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 138,
    height: 25,
  },
  heading: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 42,
    lineHeight: 41,
  },
  accent: {
    color: colors.primary,
    fontSize: 42,
    lineHeight: 41,
  },
  subtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  fields: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    top: 17,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 43,
  },
  social: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
