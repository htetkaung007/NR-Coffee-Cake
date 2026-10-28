import { parseStorageConfig, type StorageConfig } from "./storageConfig";

export interface Config {
  googleClientId: string;
  googleClientSecret: string;
  mainUrl: string;
  // Where uploaded images live (storageConfig.ts) — parsed on first use,
  // not at import: `next build` imports this file with
  // NODE_ENV=production, and a missing UPLOAD_DIR must stop the SERVER
  // (src/instrumentation.ts reads it at startup), never the build.
  readonly storage: StorageConfig;
  // IANA zone the shop operates in — the one place "what day is it for
  // this shop right now" is decided (see lib/shopDay.ts), so a UTC-day
  // boundary can never silently split a late-night order onto the
  // wrong day in reports.
  shopTimezone: string;
  // Optional public address the online menu is reached at (e.g.
  // https://menu.yourshop.com) — Settings shows the full
  // /menu?locationId=<id> link with it, the path only without. Never used in a QR code: QR codes
  // keep the in-shop (LAN) address.
  publicBaseUrl: string;
}

let storage: StorageConfig | null = null;

export const config: Config = {
  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  mainUrl: process.env.NEXTAUTH_URL || "",
  get storage() {
    storage ??= parseStorageConfig(process.env, process.env.NODE_ENV);
    return storage;
  },
  shopTimezone: process.env.SHOP_TIMEZONE || "Asia/Yangon",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
};
