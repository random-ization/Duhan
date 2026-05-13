import { describe, expect, it } from 'vitest';
import { mapAuthErrorMessage, normalizeErrorCode } from '../../apps/mobile/src/lib/authErrors';

describe('mobile auth error mapping', () => {
  it('normalizes error codes from Error instances', () => {
    expect(normalizeErrorCode(new Error(' unauthorized '))).toBe('UNAUTHORIZED');
  });

  it('normalizes error codes from object payloads', () => {
    expect(normalizeErrorCode({ code: ' token_expired ' })).toBe('TOKEN_EXPIRED');
    expect(normalizeErrorCode({ error: { code: 'forbidden' } })).toBe('FORBIDDEN');
    expect(normalizeErrorCode({ data: { message: 'invalid_login' } })).toBe('INVALID_LOGIN');
  });

  it('maps known auth/token errors to user-friendly messages', () => {
    expect(mapAuthErrorMessage(new Error('INVALID_OR_EXPIRED_TOKEN'))).toContain('链接无效或已过期');
    expect(mapAuthErrorMessage({ code: 'TOKEN_EXPIRED' })).toContain('链接无效或已过期');
    expect(mapAuthErrorMessage({ error: { code: 'SESSION_EXPIRED' } })).toContain('链接无效或已过期');
    expect(mapAuthErrorMessage(new Error('WEAK_PASSWORD'))).toContain('密码强度不足');
    expect(mapAuthErrorMessage(new Error('UNAUTHORIZED'))).toContain('登录状态已失效');
    expect(mapAuthErrorMessage(new Error('FORBIDDEN'))).toContain('无权限');
  });

  it('falls back when unknown error occurs', () => {
    expect(mapAuthErrorMessage('')).toBe('操作失败，请稍后重试。');
    expect(mapAuthErrorMessage(new Error('SOME_UNKNOWN_ERROR'))).toBe('SOME_UNKNOWN_ERROR');
    expect(mapAuthErrorMessage(null, '自定义错误')).toBe('自定义错误');
  });
});
