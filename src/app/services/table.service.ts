import { randomBytes } from "crypto";
import { prisma } from "../utils/prisma";
import { AppError, NotFoundError, ValidationError } from "../lib/errors";
import { generateQrCodeWithLogo } from "@/app/lib/qr/qrCode";
import { getFileStorageService } from "@/app/lib/storage/getFileStorageService";
import { config } from "@/app/utils/config";
import { LocationService } from "./location.service";

// Name is fixed for the counter "table" row — it isn't a real seated
// table a customer picks a name for, so locking it here (Service
// layer) means the rule holds even if something calls createTable
// directly, not just through the create-table form.
const COUNTER_TABLE_NAME = "Counter QR code";

/** Short, URL-safe, unguessable key embedded in a table's (Counter or
 *  regular) printed QR link (e.g. /counter?tableId=5&key=<this> for
 *  Counter, /table?tableId=8&key=<this> for a regular table).
 *  Regenerating it invalidates every previously-printed copy of that
 *  QR at once — see TableService.rotateAccessKey. */
function generateCounterKey() {
  return randomBytes(6).toString("base64url");
}

/**
 * Table domain — CRUD for a Location's physical tables. Split into its
 * own file from the start (Rule 14), rather than starting inside
 * AppService, since it's a clearly separate concern from Menu/Location
 * management and keeps AppService from growing further.
 *
 * Does one thing per method (Clean Code's "Do One Thing"): createTable
 * only creates the row; setTableQrCodeUrl only attaches an already-
 * uploaded QR code's URL. regenerateQrImage is the one orchestrating
 * method: it decides how a table's QR image is built and stored, but
 * still goes through FileStorageService rather than talking to S3/MinIO
 * itself.
 */
export class TableService {
  static async getTablesByLocation(locationId: number) {
    return prisma.table.findMany({
      where: { locationId, isArchived: false },
      orderBy: { id: "asc" },
    });
  }

  /** All tables across every active location in a company — e.g. for a
   *  company-wide table picker. Archived locations are excluded (mirrors
   *  LocationService.getActiveLocations), same as archived tables are. */
  static async getTablesForCompany(companyId: number) {
    const locations = await LocationService.getActiveLocations(companyId);
    const locationIds = locations.map((location) => location.id);

    return prisma.table.findMany({
      where: { locationId: { in: locationIds }, isArchived: false },
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
   *  Does not touch qrcodeImageUrl — the caller (action.ts) calls
   *  regenerateQrImage afterward, once it has the new table's id to
   *  encode.
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
        counterAccessKey: generateCounterKey(),
      },
    });
  }

  /** Does one thing: renames. Does not touch qrcodeImageUrl or
   *  isArchived — those are other methods' jobs. Note the QR code
   *  itself is unaffected by a rename, since it encodes locationId +
   *  tableId, not the name (see buildQrCodeContent),
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
   *  Mirrors MenuService.setMenuAsset — it only persists a URL that
   *  FileStorageService.upload() already returned. */
  static async setTableQrCodeUrl(tableId: number, url: string) {
    return prisma.table.update({
      where: { id: tableId },
      data: { qrcodeImageUrl: url },
    });
  }

  /** Does one thing: deletes the Table row. Does NOT touch the QR
   *  code image in storage — that's the Controller's job (action.ts),
   *  which deletes it after this returns. Callers should read
   *  qrcodeImageUrl via getTableById *before* calling this, since the
   *  row (and that URL) is gone once this returns. */
  static async deleteTable(tableId: number) {
    return prisma.table.delete({ where: { id: tableId } });
  }

  /** Issues a new counterAccessKey for ANY table (Counter or regular),
   *  invalidating every previously-printed copy of that table's QR
   *  image at once (old links now fail resolveCounterQrScan /
   *  resolveTableQrScan). This method only updates the key the Table
   *  row holds — the caller (tables/action.ts) must follow up with
   *  regenerateQrImage to reprint the image around the new key. */
  static async rotateAccessKey(tableId: number) {
    await TableService.getTableById(tableId);

    return prisma.table.update({
      where: { id: tableId },
      data: { counterAccessKey: generateCounterKey() },
    });
  }

  /** Used by the QR scan handlers (Counter and Table) to resolve
   *  tableId+key back to a Table row — returns null (rather than
   *  throwing) on any mismatch so the caller can fail closed to
   *  view-only without distinguishing "wrong table" from "stale/
   *  rotated key" (doing so would leak which case it was to whoever
   *  is probing). isCounter isn't part of the WHERE clause since both
   *  entry points now use the same key mechanism — the caller already
   *  knows which kind of table it's resolving. */
  static async findByAccessKey(tableId: number, key: string) {
    return prisma.table.findFirst({
      where: {
        id: tableId,
        counterAccessKey: key,
        isArchived: false,
      },
    });
  }

  /**
   * The one place "regenerate this table's QR image and swap it in"
   * happens — createTable, updateTable (new logo), and rotateAccessKey
   * all funnel through this instead of each repeating build→render→
   * upload→set→cleanup themselves. New image is uploaded and the DB row
   * points at it *before* the old one is touched — if cleanup below
   * fails, the table still has a working QR code, just an extra
   * orphaned file in MinIO. Deleting the old image first would risk the
   * opposite: a successful delete followed by a failed upload, leaving
   * the table with no QR image at all. A brand-new table has no old
   * image to clean up (qrcodeImageUrl defaults to ""), so this is safe
   * to call from createTable too.
   */
  static async regenerateQrImage(
    table: {
      id: number;
      locationId: number;
      isCounter: boolean | null;
      counterAccessKey: string | null;
      qrcodeImageUrl: string | null;
    },
    logoBuffer: Buffer | null,
  ) {
    if (!table.counterAccessKey) {
      throw new AppError(
        "This table has no access key to build a QR code from.",
        "VALIDATION",
      );
    }

    const qrContent = TableService.buildQrCodeContent(
      table.locationId,
      table.id,
      table.isCounter === true,
      table.counterAccessKey,
    );
    const qrImageBuffer = await generateQrCodeWithLogo(qrContent, logoBuffer);

    const storage = getFileStorageService();
    const { url } = await storage.upload(
      qrImageBuffer,
      "image/png",
      "table",
      table.id,
    );
    await TableService.setTableQrCodeUrl(table.id, url);

    if (table.qrcodeImageUrl) {
      await storage.delete(table.qrcodeImageUrl);
    }

    return url;
  }

  /**
   * Builds the URL a customer's phone opens after scanning the table's
   * QR code. Both Counter and regular tables now point at THIS app's
   * own Route Handlers (/counter, /table) — each validates the key
   * server-side, sets a cookie (a session for Counter, a per-table
   * contributor token for regular tables — see the two entries below),
   * and redirects onward to the clean, key-free /menu URL before
   * anything renders. Query-string form (Rule: keep it simple over path
   * params).
   *
   * Regular tables: /table?locationId=&tableId=&key=. Unlike Counter,
   * every phone that scans the SAME table's (valid-keyed) QR shares one
   * draft/order (see the per-customer draft design —
   * resolveTableQrScan, TableDraftService, contributorToken.ts) rather
   * than getting its own individual session the way Counter does.
   * Still DOES need reprinting periodically like Counter, for the same
   * reason: rotating the key (TableService.rotateAccessKey) is how a
   * leaked/copied table QR gets invalidated, since the physical QR
   * itself can't be un-scanned once shared.
   *
   * Counter: /counter?locationId=&tableId=&key=. Each phone that scans
   * it gets its own individual session (cookie-identified), unlike
   * Table's shared one.
   */
  private static buildQrCodeContent(
    locationId: number,
    tableId: number,
    isCounter: boolean,
    accessKey: string,
  ) {
    const origin = new URL(config.mainUrl).origin;
    const path = isCounter ? "counter" : "table";
    return `${origin}/${path}?locationId=${locationId}&tableId=${tableId}&key=${accessKey}`;
  }
}
