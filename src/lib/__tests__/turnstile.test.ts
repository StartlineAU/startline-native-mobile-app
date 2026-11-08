import * as WebBrowser from 'expo-web-browser';

import { ApiError } from '@/lib/api';
import { requestTurnstileToken, withTurnstileRetry } from '@/lib/turnstile';

jest.mock('@/config/env', () => ({
  config: { apiUrl: 'https://startlineau.com' },
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

const openAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

describe('native Turnstile hand-off', () => {
  beforeEach(() => {
    openAuthSession.mockReset();
  });

  it('returns the token passed back through the app scheme', async () => {
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'com.startlineau.app://turnstile?token=challenge-token',
    });

    await expect(requestTurnstileToken()).resolves.toBe('challenge-token');
    expect(openAuthSession).toHaveBeenCalledWith(
      'https://startlineau.com/mobile/challenge',
      'com.startlineau.app://turnstile',
      { preferEphemeralSession: true },
    );
  });

  it('surfaces a cancelled challenge', async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' });
    await expect(requestTurnstileToken()).rejects.toThrow(/cancelled/i);
  });

  it('retries once with a token only when the server asks for a challenge', async () => {
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'com.startlineau.app://turnstile?token=fresh-token',
    });
    const request = jest
      .fn()
      .mockRejectedValueOnce(
        new ApiError('Check required', 400, { code: 'BOT_CHECK_REQUIRED' }),
      )
      .mockResolvedValueOnce('registered');

    await expect(withTurnstileRetry(request)).resolves.toBe('registered');
    expect(request).toHaveBeenNthCalledWith(1);
    expect(request).toHaveBeenNthCalledWith(2, 'fresh-token');
  });

  it('does not open a challenge for an unrelated API failure', async () => {
    const request = jest.fn().mockRejectedValue(new ApiError('Not found', 404));
    await expect(withTurnstileRetry(request)).rejects.toThrow('Not found');
    expect(openAuthSession).not.toHaveBeenCalled();
  });
});
