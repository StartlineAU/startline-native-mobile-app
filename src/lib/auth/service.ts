import { Amplify } from 'aws-amplify';
import {
  confirmResetPassword,
  confirmSignIn,
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  signIn,
  signOut,
  signUp,
  type SignInOutput,
} from 'aws-amplify/auth';
import { decodeJWT } from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { config, cognitoConfigured } from '@/config/env';
import { apiRequest } from '@/lib/api';
import { setApiAuthHeaderProvider } from '@/lib/auth/api-auth';
import { secureStorage } from '@/lib/auth/secure-storage';
import type { UserProfile } from '@/types/api';

export type SocialProvider = 'google' | 'apple';

export type ChallengeType =
  | 'totp'
  | 'totp_setup'
  | 'mfa_select'
  | 'new_password'
  | 'email_verification'
  | 'reset_password';

export type SignInResult = {
  done: boolean;
  challenge?: ChallengeType;
  setupUri?: string | null;
};

export type AuthIdentity = {
  userId: string;
  username: string;
  email: string | null;
  name: string | null;
};

let pendingSignUpPassword: string | null = null;
let pendingSignUpProfile: { name: string; dateOfBirth: string } | null = null;
let configured = false;

export function configureAuth() {
  if (configured || !cognitoConfigured) return;
  configured = true;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.cognitoUserPoolId,
        userPoolClientId: config.cognitoClientId,
        loginWith: { email: true },
      },
    },
  });
  cognitoUserPoolsTokenProvider.setKeyValueStorage(secureStorage);
}

export async function getNativeTokens(): Promise<{ accessToken: string; idToken?: string } | null> {
  configureAuth();
  if (!cognitoConfigured) return null;
  try {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();
    if (!accessToken) return null;
    return {
      accessToken,
      idToken: session.tokens?.idToken?.toString(),
    };
  } catch {
    return null;
  }
}

export function installApiAuth() {
  configureAuth();
  setApiAuthHeaderProvider(getNativeTokens);
}

function totpSetupUri(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const fn = (details as Record<string, unknown>).getSetupUri;
  if (typeof fn !== 'function') return null;
  try {
    const uri = (fn as (name: string) => unknown)('Startline');
    return uri && typeof (uri as { toString(): string }).toString === 'function'
      ? (uri as { toString(): string }).toString()
      : null;
  } catch {
    return null;
  }
}

function challengeFromOutput(output: SignInOutput): SignInResult {
  const step = output.nextStep.signInStep;
  if (step === 'DONE') return { done: true };
  if (step === 'CONFIRM_SIGN_UP') return { done: false, challenge: 'email_verification' };
  if (step === 'RESET_PASSWORD') return { done: false, challenge: 'reset_password' };
  if (step === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') return { done: false, challenge: 'totp' };
  if (step === 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP') {
    return {
      done: false,
      challenge: 'totp_setup',
      setupUri: totpSetupUri(output.nextStep.totpSetupDetails),
    };
  }
  if (step === 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION') {
    return { done: false, challenge: 'mfa_select' };
  }
  if (step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
    return { done: false, challenge: 'new_password' };
  }
  return { done: false, challenge: 'email_verification' };
}

async function resolveSignInUsername(email: string): Promise<string> {
  try {
    const result = await apiRequest<{ username?: string }>('/api/user/signin-username', {
      method: 'POST',
      body: { email },
      auth: 'none',
    });
    return result.username || email;
  } catch {
    return email;
  }
}

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  configureAuth();
  const username = await resolveSignInUsername(email.trim());
  const output = await signIn({ username, password });
  return challengeFromOutput(output);
}

export async function confirmSignInCode(
  challenge: ChallengeType,
  value: string,
): Promise<SignInResult> {
  if (challenge === 'mfa_select') {
    const output = await confirmSignIn({ challengeResponse: value });
    return challengeFromOutput(output);
  }
  const output = await confirmSignIn({ challengeResponse: value });
  return challengeFromOutput(output);
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
}): Promise<void> {
  configureAuth();
  pendingSignUpPassword = input.password;
  pendingSignUpProfile = { name: input.name, dateOfBirth: input.dateOfBirth };
  await signUp({
    username: input.email.trim(),
    password: input.password,
    options: {
      userAttributes: {
        email: input.email.trim(),
        name: input.name.trim(),
        birthdate: input.dateOfBirth,
      },
    },
  });
}

export async function confirmSignUpEmail(email: string, code: string): Promise<void> {
  configureAuth();
  await confirmSignUp({ username: email.trim(), confirmationCode: code.trim() });
}

export async function signInAfterSignUp(email: string): Promise<SignInResult> {
  if (!pendingSignUpPassword) return { done: false, challenge: 'reset_password' };
  const password = pendingSignUpPassword;
  pendingSignUpPassword = null;
  return signInWithPassword(email, password);
}

/**
 * The Cognito sign-up attributes are not automatically copied onto the Prisma
 * User row. Persist the name and date of birth after the app session exists so
 * a newly verified athlete is not asked for the same details again.
 */
export async function persistPendingSignUpProfile(): Promise<void> {
  if (!pendingSignUpProfile) return;
  const profile = pendingSignUpProfile;
  pendingSignUpProfile = null;
  await apiRequest('/api/user/profile', {
    method: 'PUT',
    auth: 'required',
    body: profile,
  }).catch(() => {
    // The onboarding gate remains the fallback if this best-effort copy fails.
  });
}

export async function resendSignUpCode(email: string): Promise<void> {
  configureAuth();
  const { resendSignUpCode: resend } = await import('aws-amplify/auth');
  await resend({ username: email.trim() });
}

export async function requestPasswordReset(email: string): Promise<void> {
  configureAuth();
  await resetPassword({ username: email.trim() });
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  configureAuth();
  await confirmResetPassword({
    username: email.trim(),
    confirmationCode: code.trim(),
    newPassword,
  });
}

export async function socialSignIn(provider: SocialProvider): Promise<SignInResult> {
  configureAuth();
  if (!cognitoConfigured) throw new Error('Social sign-in is not configured.');

  const authorizationEndpoint = `https://${config.cognitoDomain}/oauth2/authorize`;
  const tokenEndpoint = `https://${config.cognitoDomain}/oauth2/token`;
  const request = new AuthSession.AuthRequest({
    clientId: config.cognitoClientId,
    redirectUri: config.oauthRedirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
    usePKCE: true,
    extraParams: {
      identity_provider: provider === 'google' ? 'Google' : 'SignInWithApple',
    },
  });

  const result = await request.promptAsync(
    { authorizationEndpoint },
    { preferEphemeralSession: false },
  );
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { done: false };
  }
  if (result.type !== 'success' || !result.params.code) {
    throw new Error(result.type === 'error' ? 'Social sign-in was refused.' : 'Sign-in failed.');
  }

  const tokens = await AuthSession.exchangeCodeAsync(
    {
      clientId: config.cognitoClientId,
      code: result.params.code,
      redirectUri: config.oauthRedirectUri,
      extraParams: request.codeVerifier
        ? { code_verifier: request.codeVerifier }
        : undefined,
    },
    { tokenEndpoint },
  );

  const accessToken = decodeJWT(tokens.accessToken);
  const idToken = tokens.idToken ? decodeJWT(tokens.idToken) : undefined;
  const issuedAt = Number(accessToken.payload.iat ?? 0) * 1000;

  await cognitoUserPoolsTokenProvider.tokenOrchestrator.setTokens({
    tokens: {
      accessToken,
      idToken,
      refreshToken: tokens.refreshToken,
      clockDrift: issuedAt > 0 ? issuedAt - Date.now() : 0,
      username: String(accessToken.payload.username ?? 'username'),
    },
  });
  await cognitoUserPoolsTokenProvider.tokenOrchestrator.setOAuthMetadata({ oauthSignIn: true });

  return { done: true };
}

export async function signOutLocally(): Promise<void> {
  configureAuth();
  if (!cognitoConfigured) return;
  await signOut({ global: false }).catch(() => {});
  await secureStorage.clear().catch(() => {});
}

export async function loadAuthIdentity(): Promise<AuthIdentity | null> {
  configureAuth();
  if (!cognitoConfigured) return null;
  try {
    const [user, session] = await Promise.all([getCurrentUser(), fetchAuthSession()]);
    const idPayload = session.tokens?.idToken?.payload ?? {};
    return {
      userId: user.userId,
      username: user.username,
      email: typeof idPayload.email === 'string' ? idPayload.email : null,
      name: typeof idPayload.name === 'string' ? idPayload.name : null,
    };
  } catch {
    return null;
  }
}

export async function provisionAppSession(): Promise<{ needsOnboarding: boolean }> {
  return apiRequest<{ needsOnboarding: boolean }>('/api/user/auth/session', {
    method: 'POST',
    auth: 'required',
  });
}

export async function fetchCurrentProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/user/profile', { auth: 'required' });
}

export async function getProfilePhotoUrl(profile: UserProfile | null): Promise<string | null> {
  return profile?.profilePicUrl ?? null;
}

export { WebBrowser };
