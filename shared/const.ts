export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Du behöver logga in.';
export const NOT_ADMIN_ERR_MSG = 'Bara admin kan göra detta.';

/**
 * Feature switches. Bilbingo (summer car bingo staffing) is hidden: menus,
 * pages, admin tab, API and reminder emails are off. Code and data are kept,
 * set to true to bring it back.
 */
export const FEATURES = {
  bilbingo: false,
} as const;
