import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

// next-intl without i18n routing: the request config is src/i18n/request.ts
// (the customer's language comes from the NEXT_LOCALE cookie).
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
