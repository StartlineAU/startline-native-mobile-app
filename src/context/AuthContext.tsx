import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  confirmPasswordReset,
  confirmSignInCode,
  confirmSignUpEmail,
  fetchCurrentProfile,
  installApiAuth,
  loadAuthIdentity,
  persistPendingSignUpProfile,
  provisionAppSession,
  requestPasswordReset,
  resendSignUpCode,
  signInAfterSignUp,
  signInWithPassword,
  signOutLocally,
  signUpWithPassword,
  socialSignIn,
  type AuthIdentity,
  type ChallengeType,
  type SignInResult,
  type SocialProvider,
} from '@/lib/auth/service';
import type { UserProfile } from '@/types/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  identity: AuthIdentity | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  needsOnboarding: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  confirmChallenge: (challenge: ChallengeType, value: string) => Promise<SignInResult>;
  signUp: (input: {
    email: string;
    password: string;
    name: string;
    dateOfBirth: string;
  }) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<SignInResult>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  signInWithProvider: (provider: SocialProvider) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  completeOnboarding: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    installApiAuth();
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadProfile = useCallback(async (): Promise<UserProfile | null> => {
    setProfileLoading(true);
    try {
      const nextProfile = await fetchCurrentProfile();
      if (mounted.current) setProfile(nextProfile);
      return nextProfile;
    } catch {
      if (mounted.current) setProfile(null);
      return null;
    } finally {
      if (mounted.current) setProfileLoading(false);
    }
  }, []);

  const establishSession = useCallback(async () => {
    const nextIdentity = await loadAuthIdentity();
    if (!nextIdentity) {
      if (mounted.current) {
        setIdentity(null);
        setProfile(null);
        setNeedsOnboarding(false);
        setStatus('unauthenticated');
      }
      return false;
    }

    if (mounted.current) {
      setIdentity(nextIdentity);
      setStatus('authenticated');
    }

    try {
      const session = await provisionAppSession();
      if (mounted.current) setNeedsOnboarding(Boolean(session.needsOnboarding));
    } catch {
      if (mounted.current) setNeedsOnboarding(false);
    }

    await loadProfile();
    return true;
  }, [loadProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      installApiAuth();
      const found = await loadAuthIdentity();
      if (cancelled) return;

      if (!found) {
        setStatus('unauthenticated');
        return;
      }

      setIdentity(found);
      setStatus('authenticated');

      try {
        const session = await provisionAppSession();
        if (!cancelled) setNeedsOnboarding(Boolean(session.needsOnboarding));
      } catch {
        // A native client may be signed in to Cognito before the API token
        // adapter is deployed. Keep the Cognito session and retry the profile.
      }
      await loadProfile();
    })().catch(() => {
      if (!cancelled) setStatus('unauthenticated');
    });

    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  const finishAuthentication = useCallback(async () => {
    await queryClient.invalidateQueries();
    await establishSession();
  }, [establishSession, queryClient]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const result = await signInWithPassword(email, password);
      if (result.done) await finishAuthentication();
      return result;
    },
    [finishAuthentication],
  );

  const confirmChallenge = useCallback(
    async (challenge: ChallengeType, value: string) => {
      setError(null);
      const result = await confirmSignInCode(challenge, value);
      if (result.done) await finishAuthentication();
      return result;
    },
    [finishAuthentication],
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; name: string; dateOfBirth: string }) => {
      setError(null);
      await signUpWithPassword(input);
    },
    [],
  );

  const confirmSignUp = useCallback(
    async (email: string, code: string) => {
      await confirmSignUpEmail(email, code);
      const result = await signInAfterSignUp(email);
      if (result.done) {
        await finishAuthentication();
        await persistPendingSignUpProfile();
        await loadProfile();
        if (mounted.current) setNeedsOnboarding(false);
      }
      return result;
    },
    [finishAuthentication, loadProfile],
  );

  const signInWithProvider = useCallback(
    async (provider: SocialProvider) => {
      setError(null);
      const result = await socialSignIn(provider);
      if (result.done) await finishAuthentication();
      return result;
    },
    [finishAuthentication],
  );

  const signOut = useCallback(async () => {
    await signOutLocally();
    queryClient.clear();
    if (mounted.current) {
      setIdentity(null);
      setProfile(null);
      setNeedsOnboarding(false);
      setStatus('unauthenticated');
      setError(null);
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      identity,
      profile,
      profileLoading,
      needsOnboarding,
      error,
      signIn,
      confirmChallenge,
      signUp,
      confirmSignUp,
      resendVerification: async (email) => {
        await resendSignUpCode(email);
      },
      forgotPassword: async (email) => {
        await requestPasswordReset(email);
      },
      resetPassword: async (email, code, password) => {
        await confirmPasswordReset(email, code, password);
      },
      signInWithProvider,
      signOut,
      refreshProfile: loadProfile,
      completeOnboarding: async () => {
        setNeedsOnboarding(false);
        await loadProfile();
      },
      clearError: () => setError(null),
    }),
    [
      status,
      identity,
      profile,
      profileLoading,
      needsOnboarding,
      error,
      signIn,
      confirmChallenge,
      signUp,
      confirmSignUp,
      signInWithProvider,
      signOut,
      loadProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
