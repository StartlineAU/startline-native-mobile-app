export function authErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';

  switch (name) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return 'Incorrect email or password.';
    case 'UserNotConfirmedException':
      return 'Confirm your email before signing in.';
    case 'PasswordResetRequiredException':
      return 'Your password needs to be reset before you can sign in.';
    case 'UsernameExistsException':
    case 'AliasExistsException':
      return 'An account with that email already exists.';
    case 'InvalidPasswordException':
      return 'Use 8+ characters with an uppercase letter, a lowercase letter and a number.';
    case 'CodeMismatchException':
    case 'EnableSoftwareTokenMFAException':
      return 'That code did not match. Check it and try again.';
    case 'ExpiredCodeException':
      return 'That code has expired. Request a new one.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'InvalidParameterException':
      return 'Check the details you entered and try again.';
    default:
      if (message.includes('Incorrect username or password')) return 'Incorrect email or password.';
      if (message.includes('User is not confirmed')) return 'Confirm your email before signing in.';
      if (message.includes('Password does not conform')) {
        return 'Use 8+ characters with an uppercase letter, a lowercase letter and a number.';
      }
      if (message.includes('Network')) return 'Check your connection and try again.';
      return message || 'Something went wrong. Please try again.';
  }
}

export function isPasswordValid(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function isAtLeast18(dateOfBirth: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return false;
  const date = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const month = today.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age -= 1;
  return age >= 18;
}

export function mfaSecretFromUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const match = /[?&]secret=([^&]+)/i.exec(uri);
  return match ? decodeURIComponent(match[1]) : null;
}
