const STATIC_ADMIN_DOMAINS = ['levelup.admin', 'levelup.app'];

const STATIC_ADMIN_ALIASES = {
  sa3doon: 'sa3doon',
  fares: 'fares',
  mahmoud: 'mahmoud',
};

const SHORT_PASSWORD_SUFFIX = '123';

export function isStaticAdminAlias(value = '') {
  const key = value.toString().trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(STATIC_ADMIN_ALIASES, key);
}

export function staticAdminPasswordForAlias(value = '') {
  const key = value.toString().trim().toLowerCase();
  return STATIC_ADMIN_ALIASES[key] || '';
}

export function staticAdminAuthPasswordForAlias(value = '') {
  const password = staticAdminPasswordForAlias(value);
  if (!password) return '';
  if (password.length >= 6) return password;
  return `${password}${SHORT_PASSWORD_SUFFIX}`;
}

export function staticAdminEmailsForAlias(value = '') {
  const key = value.toString().trim().toLowerCase();
  if (!key) return [];
  return STATIC_ADMIN_DOMAINS.map((domain) => `${key}@${domain}`);
}

export function staticAdminPrimaryEmailForAlias(value = '') {
  const key = value.toString().trim().toLowerCase();
  if (!key) return '';
  return `${key}@${STATIC_ADMIN_DOMAINS[0]}`;
}

export function isStaticAdminEmail(value = '') {
  const normalized = value.toString().trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0) return false;
  const local = normalized.substring(0, at);
  const domain = normalized.substring(at + 1);
  if (!STATIC_ADMIN_DOMAINS.includes(domain)) return false;
  return isStaticAdminAlias(local);
}

export function extractAliasFromEmail(value = '') {
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return '';
  const at = normalized.indexOf('@');
  return at === -1 ? normalized : normalized.substring(0, at);
}

export function capitalizeAlias(value = '') {
  const trimmed = value.toString().trim();
  if (!trimmed) return '';
  return `${trimmed[0].toUpperCase()}${trimmed.substring(1)}`;
}

export const STATIC_ADMIN_PREFERRED_ALIASES = ['sa3doon', 'fares', 'mahmoud'];

