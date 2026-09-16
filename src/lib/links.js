/**
 * Second line of defence for administrator-authored links.
 *
 * The backend already refuses to store a dangerous href, but content can also
 * arrive from an older record written before that validation existed, so
 * anything from the database is checked again at the point of rendering.
 */
const SAFE_EXTERNAL = /^https?:\/\//i;

export function isExternal(href = '') {
  return SAFE_EXTERNAL.test(href) || /^(mailto|tel):/i.test(href);
}

/**
 * Returns a safe href, or null if it cannot be trusted. Backslashes are
 * rejected outright: browsers normalise `/\evil.com` to `//evil.com`, which
 * navigates off-site (the React Router open-redirect advisory).
 */
export function safeHref(href) {
  if (typeof href !== 'string') return null;
  const value = href.trim();
  if (!value) return null;

  if (value.includes('\\')) return null;
  if (/^\s*(javascript|data|vbscript):/i.test(value)) return null;
  if (/^\/\//.test(value)) return null;

  if (isExternal(value)) return value;
  if (value.startsWith('/') || value.startsWith('#')) return value;

  return null;
}

/** Same rule for an in-app destination: internal paths only. */
export function safeInternalPath(path, fallback = '/') {
  if (typeof path !== 'string') return fallback;
  const value = path.trim();
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
