/** Shared API settings */

export const DEFAULT_PORT = 3000;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const RATE_LIMIT_MAX_API =
  process.env.NODE_ENV === "production" ? 100 : 2000;

export const RATE_LIMIT_MAX_AUTH = 1000;

export const RATE_LIMIT_MAX_FORGOT_PASSWORD =
  process.env.NODE_ENV === "production" ? 5 : 30;
