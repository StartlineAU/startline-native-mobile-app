import { router } from 'expo-router';
import { useEffect } from 'react';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallbackScreen() {
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === 'authenticated') router.replace('/');
  }, [auth.status]);

  return (
    <View style={styles.screen}>
      <AppText variant="eyebrow">Startline</AppText>
      <AppText variant="title" style={styles.title}>
        Finishing sign-in…
      </AppText>
      {auth.status === 'unauthenticated' ? (
        <>
          <AppText variant="bodySmall">
            This sign-in did not complete. Return to the app and try again.
          </AppText>
          <Button label="Back to sign in" onPress={() => router.replace('/auth/sign-in')} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: { textAlign: 'center' },
});
