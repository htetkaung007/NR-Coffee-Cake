export interface FileStorageService {
  upload(
    file: Buffer,
    mimeType: string,
    menuId: number,
  ): Promise<{ url: string }>;

  /** Removes a previously stored image, given the URL upload() returned.
   *  Safe to call on a URL that's already gone or not ours. */
  delete(url: string): Promise<void>;
}
