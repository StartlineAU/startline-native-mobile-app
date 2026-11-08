import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PUBLIC_ENV = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  cognitoUserPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '',
  cognitoClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '',
  cognitoDomain: process.env.EXPO_PUBLIC_COGNITO_DOMAIN ?? '',
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  socialProviders: process.env.EXPO_PUBLIC_SOCIAL_SIGN_IN ?? '',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
} as const;

function publicEnv(value: string): string {
  return value.trim();
}

function developmentApiUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:3000`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const config = {
  apiUrl: (publicEnv(PUBLIC_ENV.apiUrl) || (__DEV__ ? developmentApiUrl() : '')).replace(/\/+$/, ''),
  cognitoUserPoolId: publicEnv(PUBLIC_ENV.cognitoUserPoolId),
  cognitoClientId: publicEnv(PUBLIC_ENV.cognitoClientId),
  cognitoDomain: publicEnv(PUBLIC_ENV.cognitoDomain).replace(/^https?:\/\//, '').replace(/\/+$/, ''),
  stripePublishableKey: publicEnv(PUBLIC_ENV.stripePublishableKey),
  socialProviders: publicEnv(PUBLIC_ENV.socialProviders)
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is 'google' | 'apple' => value === 'google' || value === 'apple'),
  termsUrl: publicEnv(PUBLIC_ENV.termsUrl) || 'https://startlineau.com/terms',
  privacyUrl: publicEnv(PUBLIC_ENV.privacyUrl) || 'https://startlineau.com/privacy',
  oauthRedirectUri: 'com.startlineau.app://auth/callback',
} as const;

export const cognitoConfigured = Boolean(
  config.cognitoUserPoolId && config.cognitoClientId && config.cognitoDomain,
);
