import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/** Security headers on every response (OWASP WSTG-CONF / CLNT-09):
 *  - never framed by another site (clickjacking) — the old and the CSP
 *    way, for every browser;
 *  - no MIME sniffing; the referrer only to our own pages;
 *  - camera for this site only (the Counter QR scanner, a getUserMedia on
 *    our own page); no microphone, no location.
 *  A full script/style Content-Security-Policy is a later step (MUI /
 *  Emotion styles and the Backoffice's inline sidebar script would need
 *  nonces) — see CLAUDE.md §13. */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // No "X-Powered-By: Next.js" — don't advertise the stack.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

// next-intl without i18n routing: the request config is src/i18n/request.ts
// (the customer's language comes from the NEXT_LOCALE cookie).
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
