import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';

export function useRequireAuth(returnTo?: string) {
  const auth = useAuth();

  useEffect(() => {
    if (auth.status !== 'unauthenticated') return;
    const target = returnTo ?? '/activity';
    router.replace({
      pathname: '/auth/sign-in',
      params: { returnTo: target },
    } as Href);
  }, [auth.status, returnTo]);

  return auth;
}
