export interface FileStorageService {
  /**
   * folder groups objects by entity type ("menu", "table", ...) and id
   * is that entity's own id — together they produce a key like
   * "menu/12-1699999999.png" or "table/5-1699999999.png". Generic on
   * purpose: this service has no opinion on what kind of entity it's
   * storing an image for, so any future entity (Addon, Company logo,
   * etc.) can reuse it without another interface change.
   */
  upload(
    file: Buffer,
    mimeType: string,
    folder: string,
    id: number,
  ): Promise<{ url: string }>;

  /** Removes a previously stored image, given the URL upload() returned.
   *  Safe to call on a URL that's already gone or not ours. */
  delete(url: string): Promise<void>;
}
