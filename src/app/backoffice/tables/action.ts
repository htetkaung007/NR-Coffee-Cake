"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import {
  createTableSchema,
  updateTableSchema,
  type CreateTableInput,
  type UpdateTableInput,
} from "@/app/lib/schemas/tableSchema";
import { getSessionContext } from "@/app/lib/session";
import { getFileStorageService } from "@/app/lib/storage/getFileStorageService";

import { config } from "@/app/utils/config";
import { AppService, TableService } from "@/app/services";
import { generateQrCodeWithLogo } from "@/app/lib/qr/qrCode";

/**
 * Builds the URL a customer's phone opens after scanning the table's
 * QR code. Both Counter and regular tables now point at THIS app's
 * own Route Handlers (/customer, /table) — each validates the key
 * server-side, sets the session cookie, and redirects onward to the
 * clean, key-free /menu URL before anything renders. Query-string
 * form (Rule: keep it simple over path params).
 *
 * Regular tables: /table?locationId=&tableId=&key=. Unlike Counter,
 * every phone that scans the SAME table's (valid-keyed) QR lands in
 * the SAME shared session — see resolveTableQrScan/resolveTableSession.
 * Still DOES need reprinting periodically like Counter, for the same
 * reason: rotating the key (TableService.rotateAccessKey) is how a
 * leaked/copied table QR gets invalidated, since the physical QR
 * itself can't be un-scanned once shared.
 *
 * Counter: /customer?locationId=&tableId=&key=. Each phone that scans
 * it gets its own individual session (cookie-identified), unlike
 * Table's shared one.
 */
function buildQrCodeContent(
  locationId: number,
  tableId: number,
  isCounter: boolean,
  accessKey: string,
) {
  const origin = new URL(config.apiOrederAppUrl).origin;
  const path = isCounter ? "customer" : "table";
  return `${origin}/${path}?locationId=${locationId}&tableId=${tableId}&key=${accessKey}`;
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
async function regenerateTableQrImage(
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

  const qrContent = buildQrCodeContent(
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

const safeCreateTable = toSafeResult(async (input: CreateTableInput) => {
  const { companyId, userId } = await getSessionContext();
  if (!companyId || !userId) {
    throw new AppError(
      "You must be signed in to create a table.",
      "UNAUTHORIZED",
    );
  }

  // Same "which location am I working in" lookup Menu creation uses —
  // Admins get their SelectedLocation, Managers get their fixed
  // User.locationId. See AppService.getSelectedLocation.
  const selectedLocation = await AppService.getSelectedLocation(userId);
  if (!selectedLocation) {
    throw new AppError(
      "Select a location before creating a table.",
      "NO_SELECTED_LOCATION",
    );
  }

  const table = await TableService.createTable(
    selectedLocation.locationId,
    input.name,
    input.isCounter,
  );

  // input.logo is already validated by createTableSchema (size + mime
  // type) before this ever runs. Passing null when no logo was given
  // lets generateQrCodeWithLogo fall back to the default table icon.
  const logoBuffer = input.logo
    ? Buffer.from(await input.logo.arrayBuffer())
    : null;
  await regenerateTableQrImage(table, logoBuffer);

  return { id: table.id };
});

export async function createTableAction(formData: FormData) {
  const logoEntry = formData.get("logo");
  const logo =
    logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;

  const result = await validateWith(createTableSchema, {
    name: formData.get("name"),
    isCounter: formData.get("isCounter") === "true",
    logo,
  }).asyncAndThen(safeCreateTable);

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/tables");
  }

  return actionResult;
}

const safeUpdateTable = toSafeResult(
  async (input: UpdateTableInput & { tableId: number }) => {
    const { companyId } = await getSessionContext();
    if (!companyId) {
      throw new AppError("You must be signed in.", "UNAUTHORIZED");
    }

    const existingTable = await TableService.getTableById(input.tableId);
    await TableService.updateTableName(input.tableId, input.name);

    // Logo is optional on edit too — only touch the QR code at all if
    // the user actually picked a new file this time. QR *content* (the
    // URL) never changes on edit — it's built from locationId +
    // tableId, neither of which this action can change. Only the
    // *image* (logo baked into the PNG) needs regenerating, so
    // already-printed QR codes with the old logo still scan to the
    // same place; only their look goes stale until reprinted.
    if (input.logo) {
      const logoBuffer = Buffer.from(await input.logo.arrayBuffer());
      await regenerateTableQrImage(existingTable, logoBuffer);
    }

    return { id: input.tableId };
  },
);

export async function updateTableAction(tableId: number, formData: FormData) {
  const logoEntry = formData.get("logo");
  const logo =
    logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;

  const result = await validateWith(updateTableSchema, {
    name: formData.get("name"),
    logo,
  }).asyncAndThen((data) => safeUpdateTable({ ...data, tableId }));

  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/tables");
    revalidatePath(`/backoffice/tables/${tableId}`);
  }

  return actionResult;
}

/**
 * Deletes DB row first, then the stored QR image. If storage.delete()
 * fails after a successful DB delete, we're left with an orphaned
 * image and no row pointing at it — annoying (a stray file in the
 * bucket) but harmless, since nothing can reach it through the app
 * anymore. The reverse order risks something worse: deleting the image
 * but failing to delete the row would leave a live Table with a broken
 * qrcodeImageUrl link, which is user-visible. DB is the source of
 * truth, so it goes first.
 */
const safeDeleteTable = toSafeResult(async (tableId: number) => {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }

  const table = await TableService.getTableById(tableId);
  await TableService.deleteTable(tableId);

  if (table.qrcodeImageUrl) {
    const storage = getFileStorageService();
    await storage.delete(table.qrcodeImageUrl);
  }

  return { id: tableId };
});

export async function deleteTableAction(tableId: number) {
  const result = await safeDeleteTable(tableId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/tables");
  }

  return actionResult;
}

/**
 * Staff-triggered: issues a new counterAccessKey for ANY table
 * (Counter or regular) and reprints the QR image around it. Every
 * previously-printed copy of the old QR — screenshot, saved photo, or
 * the physical sticker until it's swapped — stops resolving
 * immediately (OrderSessionService.resolveCounterQrScan /
 * resolveTableQrScan will no longer find a Table matching the old
 * key). Use this if a table's QR is suspected to have been
 * copied/shared beyond its physical spot, or just on a periodic
 * rotation schedule.
 *
 * Note: regenerates the QR with the default icon, not any custom logo
 * that was uploaded originally — logos aren't persisted separately
 * from the rendered image, only baked into it at upload time. Staff
 * can re-upload the logo afterward via updateTableAction if needed.
 */
const safeRotateAccessKey = toSafeResult(async (tableId: number) => {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }

  const rotated = await TableService.rotateAccessKey(tableId);
  await regenerateTableQrImage(rotated, null);

  return { id: rotated.id };
});

export async function rotateAccessKeyAction(tableId: number) {
  const result = await safeRotateAccessKey(tableId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/tables");
    revalidatePath(`/backoffice/tables/${tableId}`);
  }

  return actionResult;
}
