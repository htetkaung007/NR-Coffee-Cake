export interface Config {
  googleClientId: string;
  googleClientSecret: string;
  mainUrl: string;
  storageProvider: string;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  minioBucket: string;
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

export const config: Config = {
  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  mainUrl: process.env.NEXTAUTH_URL || "",
  storageProvider: process.env.STORAGE_PROVIDER || "s3",
  minioEndpoint: process.env.MINIO_ENDPOINT || "",
  minioAccessKey: process.env.MINIO_ACCESS_KEY || "",
  minioSecretKey: process.env.MINIO_SECRET_KEY || "",
  minioBucket: process.env.MINIO_BUCKET || "",
  shopTimezone: process.env.SHOP_TIMEZONE || "Asia/Yangon",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
};
