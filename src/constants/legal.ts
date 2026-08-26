/**
 * Served from the marketing site in landing/, so the policy sits on the
 * product's own domain rather than a github.io address. `cleanUrls` in
 * landing/vercel.json is what makes /privacy serve privacy.html.
 *
 * The old GitHub Pages URL still resolves and redirects here, because it
 * was published and may be recorded in a store listing: a privacy policy
 * that 404s fails review, which is the one place this link has to work.
 *
 * Contact email and developer name are filled in with real values; the
 * page's own "Before you publish this" callout is a standing reminder that
 * a qualified lawyer should review it before payments or new regions are
 * added, not a placeholder that still needs data.
 */
export const PRIVACY_POLICY_URL = 'https://citadelfitness.app/privacy';
