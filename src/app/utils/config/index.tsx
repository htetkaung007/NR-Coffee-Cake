export interface Config {
  googleClientId: string;
  googleClientSecreat: string;
  apiBackOfficeUrl: string;

  orderAppUrl: string;
  vercelBlog: string;
  storageProvider: string;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  minioBucket: string;
}

export const config: Config = {
  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
  googleClientSecreat: process.env.GOOGLE_CLIENT_SECRET as string,
  apiBackOfficeUrl: process.env.NEXT_PUBLIC_BACK_OFFICE_API_BASE_URL || "",

  orderAppUrl: process.env.NEXT_PUBLIC_ORDER_APP_PAGE || "",
  vercelBlog: process.env.BLOB_READ_WRITE_TOKEN || "",
  storageProvider: process.env.STORAGE_PROVIDER || "s3",
  minioEndpoint: process.env.MINIO_ENDPOINT || "",
  minioAccessKey: process.env.MINIO_ACCESS_KEY || "",
  minioSecretKey: process.env.MINIO_SECRET_KEY || "",
  minioBucket: process.env.MINIO_BUCKET || "",
};
