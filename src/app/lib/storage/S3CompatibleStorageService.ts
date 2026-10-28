import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import type { S3Settings } from "../../utils/config/storageConfig";
import { assetContentType, buildAssetKey, type AssetFolder } from "./assetKey";
import type { FileStorageService, StoredFile } from "./FileStorageService";

/**
 * STORAGE_PROVIDER=s3 — kept as the path back to the cloud: MinIO, AWS
 * S3 and DigitalOcean Spaces all speak the same S3 API, so moving there
 * is a .env change (MINIO_*), not a code change. The object key is the
 * same key the local provider uses. The browser never talks to the
 * store: the /assets route streams objects through open().
 */
export class S3CompatibleStorageService implements FileStorageService {
  private client: S3Client;
  private bucket: string;

  constructor(settings: S3Settings) {
    this.bucket = settings.bucket;
    this.client = new S3Client({
      endpoint: settings.endpoint,
      region: "us-east-1", // required by the SDK, unused by MinIO itself
      credentials: {
        accessKeyId: settings.accessKey,
        secretAccessKey: settings.secretKey,
      },
      // MinIO expects http://endpoint/bucket/key rather than AWS's
      // virtual-hosted http://bucket.endpoint/key — the one MinIO-specific
      // line; everything else is plain S3 API.
      forcePathStyle: true,
    });
  }

  async upload(file: Buffer, folder: AssetFolder, id: number) {
    const key = buildAssetKey(folder, id);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: assetContentType(key),
      }),
    );
    return { key };
  }

  /** S3's DeleteObject already succeeds for a key that isn't there. */
  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async open(key: string): Promise<StoredFile | null> {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!object.Body || object.ContentLength === undefined) return null;
      return {
        body: object.Body.transformToWebStream() as ReadableStream<Uint8Array>,
        size: object.ContentLength,
      };
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }
}
