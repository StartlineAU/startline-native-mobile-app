import * as WebBrowser from 'expo-web-browser';

import { config } from '@/config/env';
import { ApiError, isApiError } from '@/lib/api';

const RETURN_URL = 'com.startlineau.app://turnstile';

function isChallengeError(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.code === 'BOT_CHECK_REQUIRED' || error.code === 'BOT_CHECK_FAILED')
  );
}

/**
 * Ask the production website to run Cloudflare Turnstile in the system browser
 * and return its short-lived token through the app scheme.
 *
 * Staging and local development intentionally fail open on the server, so this
 * is only reached when the API explicitly asks a request for a bot check.
 */
export async function requestTurnstileToken(): Promise<string> {
  if (!config.apiUrl) throw new ApiError('Turnstile is not configured.', 0);

  const result = await WebBrowser.openAuthSessionAsync(
    `${config.apiUrl}/mobile/challenge`,
    RETURN_URL,
    { preferEphemeralSession: true },
  );

  if (result.type !== 'success') {
    throw new ApiError('The security check was cancelled.', 0);
  }

  const token = new URL(result.url).searchParams.get('token');
  if (!token) throw new ApiError('The security check did not return a token.', 0);
  return token;
}

/** Retry one bot-protected request once after a hosted Turnstile challenge. */
export async function withTurnstileRetry<T>(
  request: (turnstileToken?: string) => Promise<T>,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!isChallengeError(error)) throw error;
    const token = await requestTurnstileToken();
    return request(token);
  }
}
