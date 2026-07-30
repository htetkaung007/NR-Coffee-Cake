import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../../utils/config";
import type { FileStorageService } from "./FileStorageService";

/**
 * Works against MinIO today (local, offline-capable) and, unchanged,
 * against AWS S3 or DigitalOcean Spaces later — all three speak the
 * same S3 API, so only the endpoint/credentials in .env need to change
 * when the deployment target changes. See getFileStorageService.ts.
 */
export class S3CompatibleStorageService implements FileStorageService {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    const { minioEndpoint, minioAccessKey, minioSecretKey, minioBucket } =
      config;

    if (!minioEndpoint || !minioAccessKey || !minioSecretKey || !minioBucket) {
      throw new Error(
        "Missing MinIO/S3 config — check minioEndpoint, minioAccessKey, " +
          "minioSecretKey, minioBucket in .env.",
      );
    }

    this.bucket = minioBucket;
    this.publicBaseUrl = `${minioEndpoint}/${minioBucket}`;

    this.client = new S3Client({
      endpoint: minioEndpoint,
      region: "us-east-1", // required by the SDK, unused by MinIO itself
      credentials: {
        accessKeyId: minioAccessKey,
        secretAccessKey: minioSecretKey,
      },
      // MinIO expects http://endpoint/bucket/key rather than AWS's
      // virtual-hosted http://bucket.endpoint/key — this flag is the

      forcePathStyle: true, //this is the one MinIO-specific line; everything else is plain S3 API.
    });
  }

  async upload(file: Buffer, mimeType: string, menuId: number) {
    const extension = mimeType.split("/")[1] ?? "bin";
    const key = `menu/${menuId}-${Date.now()}.${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      }),
    );

    return { url: `${this.publicBaseUrl}/${key}` };
  }

  /**
   * Deletes the stored image. Takes the full URL (the same string saved
   * on Menu.assetUrl) rather than menuId, because upload() names each
   * object with a timestamp — there's no way to reconstruct the exact
   * key from menuId alone. The caller looks up the menu's current
   * assetUrl first and passes it here before overwriting/clearing it.
   */
  async delete(assetUrl: string) {
    if (!assetUrl.startsWith(this.publicBaseUrl)) return; // not one of ours
    const key = assetUrl.slice(this.publicBaseUrl.length + 1);

    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
