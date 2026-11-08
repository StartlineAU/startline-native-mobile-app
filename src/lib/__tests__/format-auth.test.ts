import { authErrorMessage, isAtLeast18, isPasswordValid, mfaSecretFromUri } from '@/lib/auth/errors';
import { formatDateTime, formatMoney, formatPrice, stripHtml } from '@/lib/format';

describe('auth validation', () => {
  it('requires all components of the Startline password policy', () => {
    expect(isPasswordValid('Password1')).toBe(true);
    expect(isPasswordValid('password1')).toBe(false);
    expect(isPasswordValid('Password')).toBe(false);
    expect(isPasswordValid('Pass1')).toBe(false);
  });

  it('accepts only adults at sign-up', () => {
    expect(isAtLeast18('1990-01-01')).toBe(true);
    expect(isAtLeast18(new Date().toISOString().slice(0, 10))).toBe(false);
    expect(isAtLeast18('not-a-date')).toBe(false);
  });

  it('extracts an authenticator setup secret from a TOTP URI', () => {
    expect(
      mfaSecretFromUri('otpauth://totp/Startline:user?secret=ABC123&issuer=Startline'),
    ).toBe('ABC123');
    expect(mfaSecretFromUri(null)).toBeNull();
  });

  it('maps Cognito failures to readable messages', () => {
    const error = new Error('Incorrect username or password.');
    error.name = 'NotAuthorizedException';
    expect(authErrorMessage(error)).toBe('Incorrect email or password.');
  });
});

describe('formatting', () => {
  it('formats AUD amounts with no unnecessary decimal places', () => {
    expect(formatMoney(5_445)).toBe('$54.45');
    expect(formatMoney(10_000)).toBe('$100');
  });

  it('renders free and missing prices explicitly', () => {
    expect(formatPrice(0)).toBe('Free');
    expect(formatPrice(null)).toBe('See event');
    expect(formatPrice(75)).toBe('$75');
  });

  it('converts organiser HTML into readable mobile text', () => {
    expect(stripHtml('<p>Fast &amp; flat</p><ul><li>10km</li></ul>')).toBe('Fast & flat\n\n• 10km');
  });

  it('formats an event date and 24-hour time for Australian readers', () => {
    expect(formatDateTime('2026-11-14', '07:00')).toContain('7:00 AM');
  });
});
