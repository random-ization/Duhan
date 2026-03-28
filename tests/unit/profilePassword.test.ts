import { describe, expect, it } from 'vitest';
import { isIncorrectPasswordError, validatePasswordChange } from '../../src/utils/profilePassword';

describe('profilePassword utils', () => {
  it('rejects weak passwords before submit', () => {
    expect(validatePasswordChange('12345', '12345')).toBe('weak');
  });

  it('rejects mismatched passwords', () => {
    expect(validatePasswordChange('123456', '654321')).toBe('mismatch');
  });

  it('accepts valid password pairs', () => {
    expect(validatePasswordChange('123456', '123456')).toBeNull();
  });

  it('detects incorrect password backend errors', () => {
    expect(isIncorrectPasswordError('INCORRECT_PASSWORD')).toBe(true);
    expect(isIncorrectPasswordError('wrong current password')).toBe(true);
    expect(isIncorrectPasswordError('network timeout')).toBe(false);
  });
});
