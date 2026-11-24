import type { TranslationKey } from "./en";

/** Maps backend error `code` → translation key.
 *  When the API returns `{ error: "...", code: "account_locked" }`, we
 *  ignore the English `message` and look up the user's language instead.
 *  Add a new entry here whenever the API introduces a new error code. */
const ERROR_CODE_MAP: Record<string, TranslationKey> = {
  invalid_credentials: "error.invalidCredentials",
  account_locked: "error.accountLocked",
  too_many_requests: "error.tooManyRequests",
  csrf_failed: "error.sessionExpired",
  unauthenticated: "error.sessionExpired",
  session_idle: "error.sessionExpired",
  password_change_required: "error.passwordChangeRequired",
  forbidden: "error.forbidden",
  not_found: "error.notFound",
  validation_failed: "error.validationFailed",
  invalid_token: "error.invalidToken",
  invalid_invite: "error.invalidInvite",
};

/** Translate an API error. Falls back to the server's English message
 *  if the code isn't in the map (so unknown errors still surface something). */
export function translateApiError(
  t: (key: TranslationKey) => string,
  code: string | undefined,
  fallback: string,
): string {
  if (code) {
    const key = ERROR_CODE_MAP[code];
    if (key) return t(key);
  }
  return fallback;
}
