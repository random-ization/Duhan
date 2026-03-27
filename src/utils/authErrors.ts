import { toErrorMessage } from './errors';

export type AuthErrorCopy = {
  fallback: string;
  invalidCredentials: string;
  tooManyAttempts: string;
  emailRequired: string;
  accountExistsLinkRequired: string;
  kakaoEmailRequired: string;
  emailAlreadyExists?: string;
  timeout?: string;
};

const AUTH_ERROR_CODES = [
  'AUTH_REQUEST_TIMEOUT',
  'InvalidSecret',
  'TooManyFailedAttempts',
  'INVALID_CREDENTIALS',
  'EMAIL_ALREADY_EXISTS',
  'ACCOUNT_EXISTS_LINK_REQUIRED',
  'KAKAO_EMAIL_REQUIRED',
  'EMAIL_REQUIRED',
  'USER_NOT_FOUND',
] as const;

function detectAuthErrorCode(rawMessage: string): string | null {
  for (const code of AUTH_ERROR_CODES) {
    if (rawMessage.includes(code)) {
      return code;
    }
  }

  const explicitCodeMatch = rawMessage.match(/Error:\s*([A-Za-z_][A-Za-z0-9_]*)/);
  return explicitCodeMatch?.[1] ?? null;
}

export function resolveAuthErrorMessage(err: unknown, copy: AuthErrorCopy): string {
  const rawMessage = toErrorMessage(err);
  const code = detectAuthErrorCode(rawMessage);

  switch (code) {
    case 'AUTH_REQUEST_TIMEOUT':
      return copy.timeout ?? copy.fallback;
    case 'InvalidSecret':
    case 'INVALID_CREDENTIALS':
    case 'USER_NOT_FOUND':
      return copy.invalidCredentials;
    case 'TooManyFailedAttempts':
      return copy.tooManyAttempts;
    case 'EMAIL_REQUIRED':
      return copy.emailRequired;
    case 'ACCOUNT_EXISTS_LINK_REQUIRED':
      return copy.accountExistsLinkRequired;
    case 'KAKAO_EMAIL_REQUIRED':
      return copy.kakaoEmailRequired;
    case 'EMAIL_ALREADY_EXISTS':
      return copy.emailAlreadyExists ?? copy.accountExistsLinkRequired;
    default:
      return copy.fallback;
  }
}
