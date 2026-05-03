// Cookie name + helpers used by the consent middleware fast-path.
//
// The middleware can't easily query Postgres on every request, so we set this
// cookie when the user submits consent. It carries the accepted TERMS_VERSION
// — bumping the constant invalidates everyone's cookies on next request and
// pushes them through /auth/consent again.
export const CONSENT_COOKIE = "seder_consent_v";
// 1 year — long enough to avoid re-prompts when terms are stable, short enough
// that a deleted account / cleared cookies won't bypass forever.
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
