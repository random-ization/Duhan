/**
 * Public-safe Convex helpers that do NOT import `convex/react` or
 * `convex/_generated/api`.
 *
 * Pre-auth pages (landing, pricing, terms, learn guides, etc.) need two
 * things that previously forced `vendor-convex` (~25 kB gz) into the
 * entry chunk:
 *
 * 1. A way to check "is this visitor already signed in?" so Landing can
 *    bounce them to /dashboard. Historically `useConvexAuth()` did this
 *    via the WebSocket client. We replace it with a synchronous
 *    localStorage probe for the auth token stored by `@convex-dev/auth`.
 *
 * 2. A way to call the public `lemonsqueezy:getVariantPrices` action to
 *    show live pricing on the landing hero. Previously done via
 *    `useAction()` (which requires `<ConvexAuthProvider>`). We replace
 *    it with a direct HTTP `POST ${convexUrl}/api/action`, matching the
 *    protocol that `ConvexHttpClient` uses internally.
 *
 * Neither helper needs the Convex provider context, so pages that only
 * consume these helpers no longer preload any Convex module.
 */

import { getConvexUrl } from './convexConfig';

// `@convex-dev/auth` stores its JWT under a key of the form
// `__convexAuthJWT_${escapedNamespace}` where `namespace` defaults to
// the deployment URL (alphanumerics only). We scan for any key with
// that prefix rather than hard-coding a namespace so this keeps working
// if the deployment URL changes (e.g. between preview + prod).
const JWT_STORAGE_KEY_PREFIX = '__convexAuthJWT_';

/**
 * Returns true iff the browser holds a non-empty Convex Auth JWT in
 * localStorage. This is a heuristic — the token may be expired or
 * invalid server-side — so we only use it as a hint to kick off the
 * full auth-backed redirect on /dashboard (which re-validates).
 */
export function hasConvexAuthToken(): boolean {
  if (typeof globalThis.window === 'undefined') return false;

  try {
    const storage = globalThis.window.localStorage;
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(JWT_STORAGE_KEY_PREFIX)) continue;
      const value = storage.getItem(key);
      if (value && value.length > 0) return true;
    }
  } catch {
    // localStorage unavailable (private mode, SSR, etc.) — treat as
    // unauthenticated.
  }

  return false;
}

type ActionSuccess = { status: 'success'; value: unknown };
type ActionFailure = {
  status: 'error';
  errorMessage: string;
  errorData?: unknown;
};
type ActionResponse = ActionSuccess | ActionFailure;

/**
 * Best-effort read of the Convex Auth JWT from localStorage. Used by
 * `callAuthenticatedConvexAction` to attach a bearer token without
 * pulling `convex/react` into the public bundle. Returns `null` if no
 * token is present; callers should handle that explicitly (usually by
 * routing the user to /login).
 */
function readConvexAuthJwt(): string | null {
  if (typeof globalThis.window === 'undefined') return null;
  try {
    const storage = globalThis.window.localStorage;
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(JWT_STORAGE_KEY_PREFIX)) continue;
      const value = storage.getItem(key);
      if (value && value.length > 0) return value;
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

/**
 * Call a Convex action over plain HTTP without going through the
 * WebSocket-based React client. The request/response shape matches the
 * wire protocol documented in `convex/src/browser/http_client.ts`.
 *
 * `path` is the dotted-notation function name, e.g. `'lemonsqueezy:getVariantPrices'`
 * (matching what `getFunctionName(api.lemonsqueezy.getVariantPrices)` produces).
 *
 * We don't attach auth headers because the only pre-auth caller is
 * Landing's pricing fetch, which is a `publicAction`.
 */
async function callConvexEndpoint<TArgs extends Record<string, unknown>, TResult>(
  endpoint: 'action' | 'query',
  path: string,
  args: TArgs,
  options: { signal?: AbortSignal; authToken?: string | null } = {}
): Promise<TResult> {
  const baseUrl = getConvexUrl().replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  const response = await fetch(`${baseUrl}/api/${endpoint}`, {
    method: 'POST',
    signal: options.signal,
    headers,
    body: JSON.stringify({
      path,
      format: 'convex_encoded_json',
      args: [args],
    }),
  });

  // Convex returns 560 when the UDF itself throws — the body still contains
  // the structured error payload we want to surface, so only non-560 HTTP
  // failures short-circuit with the raw response text.
  if (!response.ok && response.status !== 560) {
    throw new Error(`Convex HTTP ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as ActionResponse;
  if (body.status === 'success') {
    return body.value as TResult;
  }
  throw new Error(body.errorMessage || 'Convex call failed');
}

/**
 * Call a Convex action anonymously. Used by pre-auth pages for
 * `publicAction`-annotated functions (e.g. pricing lookup on Landing).
 */
export async function callPublicConvexAction<TArgs extends Record<string, unknown>, TResult>(
  path: string,
  args: TArgs,
  options: { signal?: AbortSignal } = {}
): Promise<TResult> {
  return callConvexEndpoint<TArgs, TResult>('action', path, args, options);
}

/**
 * Call a Convex query anonymously (public content like legal documents,
 * site settings, etc.).
 */
export async function callPublicConvexQuery<TArgs extends Record<string, unknown>, TResult>(
  path: string,
  args: TArgs,
  options: { signal?: AbortSignal } = {}
): Promise<TResult> {
  return callConvexEndpoint<TArgs, TResult>('query', path, args, options);
}

/**
 * Call a Convex query with a bearer token read from localStorage.
 *
 * This keeps public pages such as pricing lightweight while still letting
 * signed-in users see account-specific state after hydration.
 */
export async function callAuthenticatedConvexQuery<
  TArgs extends Record<string, unknown>,
  TResult,
>(path: string, args: TArgs, options: { signal?: AbortSignal } = {}): Promise<TResult> {
  const authToken = readConvexAuthJwt();
  if (!authToken) {
    throw new Error('NOT_AUTHENTICATED');
  }
  return callConvexEndpoint<TArgs, TResult>('query', path, args, {
    ...options,
    authToken,
  });
}

/**
 * Call a Convex action with a bearer token read from localStorage.
 *
 * This is for actions that **logically** require a signed-in user but
 * are invoked from pages that must remain Convex-free at module load
 * time (checkout flow on Pricing Details, etc.). Call this at the
 * moment of user interaction — at that point the JWT either exists in
 * storage (cheap to read) or we should redirect to /login.
 *
 * Throws `NOT_AUTHENTICATED` if no token is present.
 */
export async function callAuthenticatedConvexAction<
  TArgs extends Record<string, unknown>,
  TResult,
>(path: string, args: TArgs, options: { signal?: AbortSignal } = {}): Promise<TResult> {
  const authToken = readConvexAuthJwt();
  if (!authToken) {
    throw new Error('NOT_AUTHENTICATED');
  }
  return callConvexEndpoint<TArgs, TResult>('action', path, args, {
    ...options,
    authToken,
  });
}
