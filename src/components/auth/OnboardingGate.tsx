import { router, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';

export function OnboardingGate() {
  const auth = useAuth();
  const segments = useSegments() as string[];

  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.needsOnboarding) return;
    const onOnboarding = segments[0] === 'auth' && segments[1] === 'onboarding';
    if (!onOnboarding) router.replace('/auth/onboarding');
  }, [auth.status, auth.needsOnboarding, segments]);

  return null;
}
