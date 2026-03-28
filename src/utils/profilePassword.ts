export type PasswordChangeValidationResult = 'weak' | 'mismatch' | null;

export function validatePasswordChange(
  newPassword: string,
  confirmPassword: string
): PasswordChangeValidationResult {
  if (newPassword.length < 6) return 'weak';
  if (newPassword !== confirmPassword) return 'mismatch';
  return null;
}

export function isIncorrectPasswordError(message: string): boolean {
  return (
    message.includes('incorrect') ||
    message.includes('wrong') ||
    message.includes('INCORRECT_PASSWORD')
  );
}
