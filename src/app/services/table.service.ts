import { randomBytes } from "crypto";
import { prisma } from "../utils/prisma";
import { NotFoundError, ValidationError } from "../lib/errors";

// Name is fixed for the counter "table" row — it isn't a real seated
// table a customer picks a name for, so locking it here (Service
// layer) means the rule holds even if something calls createTable
// directly, not just through the create-table form.
const COUNTER_TABLE_NAME = "Counter QR code";

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

  /** True if this location already has a counter row — a location
   *  should only ever have one, so createTable checks this before
   *  creating a second one. */
  static async hasCounterForLocation(locationId: number) {
    const counter = await prisma.table.findFirst({
      where: { locationId, isCounter: true, isArchived: false },
    });
    return counter !== null;
  }

  /** Does one thing: creates a table with a name under a location.
   *  Does not touch qrcodeImageUrl — the caller (action.ts) uploads
   *  the QR code image afterward, once it has the new table's id to
   *  encode, then calls setTableQrCodeUrl separately.
   *
   *  When isCounter is true, the given name is ignored in favor of
   *  the fixed COUNTER_TABLE_NAME — the counter isn't a seat a staff
   *  member names, it's a single fixed entry point for walk-in
   *  orders, so there's nothing for a custom name to describe. */
  static async createTable(
    locationId: number,
    name: string,
    isCounter = false,
  ) {
    if (isCounter) {
      const alreadyHasCounter =
        await TableService.hasCounterForLocation(locationId);
      if (alreadyHasCounter) {
        throw new ValidationError(
          "This location already has a Counter QR code.",
        );
      }
    }

    return prisma.table.create({
      data: {
        name: isCounter ? COUNTER_TABLE_NAME : name,
        locationId,
        isCounter,
        // Random, URL-safe key baked into the Counter QR's printed
        // URL — see Table.counterAccessKey's doc comment in
        // schema.prisma for what this is (and isn't) for. Only
        // generated for Counter rows; regular tables have no
        // equivalent guessable-URL risk to protect against.
        counterAccessKey: isCounter
          ? randomBytes(12).toString("base64url")
          : null,
      },
    });
  }

  /** Does one thing: renames. Does not touch qrcodeImageUrl or
   *  isArchived — those are other methods' jobs. Note the QR code
   *  itself is unaffected by a rename, since it encodes locationId +
   *  tableId, not the name (see tables/action.ts buildQrCodeContent),
   *  so there's nothing to regenerate here.
   *
   *  Refuses to rename a counter row — the locked name is part of
   *  what makes it recognizable as "the counter" rather than a table,
   *  both in the UI and to anyone reading the row directly. */
  static async updateTableName(tableId: number, name: string) {
    const table = await TableService.getTableById(tableId);
    if (table.isCounter) {
      throw new ValidationError("The Counter QR code's name can't be changed.");
    }

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
