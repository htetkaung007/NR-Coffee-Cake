import { prisma } from "../utils/prisma";
import { NotFoundError } from "../lib/errors";

/**
 * Table domain — CRUD for a Location's physical tables. Split into its
 * own file from the start (Rule 14), rather than starting inside
 * AppService, since it's a clearly separate concern from Menu/Location
 * management and keeps AppService from growing further.
 *
 * Does one thing per method (Clean Code's "Do One Thing"): createTable
 * only creates the row; setTableQrCodeUrl only attaches an already-
 * uploaded QR code's URL. The image upload itself belongs to the
 * storage layer (FileStorageService), not here — this Service only
 * knows about Table rows, never about S3/MinIO.
 */
export class TableService {
  static async getTablesByLocation(locationId: number) {
    return prisma.table.findMany({
      where: { locationId, isArchived: false },
      orderBy: { id: "asc" },
    });
  }

  static async getTableById(tableId: number) {
    const table = await prisma.table.findFirst({ where: { id: tableId } });
    if (!table) throw new NotFoundError("Table", String(tableId));
    return table;
  }

  /** Does one thing: creates a table with a name under a location.
   *  Does not touch qrcodeImageUrl — the caller (action.ts) uploads
   *  the QR code image afterward, once it has the new table's id to
   *  encode, then calls setTableQrCodeUrl separately. */
  static async createTable(locationId: number, name: string) {
    return prisma.table.create({ data: { name, locationId } });
  }

  /** Does one thing: renames. Does not touch qrcodeImageUrl or
   *  isArchived — those are other methods' jobs. Note the QR code
   *  itself is unaffected by a rename, since it encodes locationId +
   *  tableId, not the name (see tables/action.ts buildQrCodeContent),
   *  so there's nothing to regenerate here. */
  static async updateTableName(tableId: number, name: string) {
    return prisma.table.update({
      where: { id: tableId },
      data: { name },
    });
  }

  /** Does one thing: attaches a QR code image URL to an existing table.
   *  Mirrors MenuService.setMenuAsset — the Service layer never talks
   *  to the storage provider directly, it only persists the URL the
   *  Controller already got back from FileStorageService.upload(). */
  static async setTableQrCodeUrl(tableId: number, url: string) {
    return prisma.table.update({
      where: { id: tableId },
      data: { qrcodeImageUrl: url },
    });
  }

  /** Does one thing: deletes the Table row. Does NOT touch the QR
   *  code image in storage — that's the Controller's job (action.ts),
   *  since this Service has no dependency on FileStorageService (Rule
   *  1: Services stay storage-provider-agnostic). Callers should read
   *  qrcodeImageUrl via getTableById *before* calling this, since the
   *  row (and that URL) is gone once this returns. */
  static async deleteTable(tableId: number) {
    return prisma.table.delete({ where: { id: tableId } });
  }
}
