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
 * QR code. Query-string form (Rule: keep it simple over path params) —
 * apiOrederAppUrl already comes from env/config, so the order app's own
 * route only needs to read two search params, no route-shape coupling
 * between this app and that one.
 */
function buildQrCodeContent(locationId: number, tableId: number) {
  return `${config.apiOrederAppUrl}?locationId=${locationId}&tableId=${tableId}`;
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
  );

  // QR code is generated from locationId (stable) rather than the
  // location's name (can be renamed later, which would silently break
  // every already-printed QR code if the name were baked into it).
  const qrContent = buildQrCodeContent(selectedLocation.locationId, table.id);

  // input.logo is already validated by createTableSchema (size + mime
  // type) before this ever runs. Passing null when no logo was given
  // lets generateQrCodeWithLogo fall back to the default table icon.
  const logoBuffer = input.logo
    ? Buffer.from(await input.logo.arrayBuffer())
    : null;
  const qrImageBuffer = await generateQrCodeWithLogo(qrContent, logoBuffer);

  const storage = getFileStorageService();
  const { url } = await storage.upload(
    qrImageBuffer,
    "image/png",
    "table",
    table.id,
  );
  await TableService.setTableQrCodeUrl(table.id, url);

  return { id: table.id };
});

export async function createTableAction(formData: FormData) {
  const logoEntry = formData.get("logo");
  const logo =
    logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;

  const result = await validateWith(createTableSchema, {
    name: formData.get("name"),
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
    // the user actually picked a new file this time.
    if (input.logo) {
      // QR *content* (the URL) never changes on edit — it's built from
      // locationId + tableId, neither of which this action can change.
      // Only the *image* (logo baked into the PNG) needs regenerating,
      // so already-printed QR codes with the old logo still scan to
      // the same place; only their look goes stale until reprinted.
      const qrContent = buildQrCodeContent(
        existingTable.locationId,
        existingTable.id,
      );
      const logoBuffer = Buffer.from(await input.logo.arrayBuffer());
      const qrImageBuffer = await generateQrCodeWithLogo(qrContent, logoBuffer);

      const storage = getFileStorageService();
      const { url } = await storage.upload(
        qrImageBuffer,
        "image/png",
        "table",
        existingTable.id,
      );

      // New image is uploaded and the DB row points at it *before* we
      // touch the old one — if cleanup below fails, the table still
      // has a working QR code, just an extra orphaned file in MinIO.
      // Deleting the old image first would risk the opposite: a
      // successful delete followed by a failed upload, leaving the
      // table with no QR image at all.
      await TableService.setTableQrCodeUrl(existingTable.id, url);

      if (existingTable.qrcodeImageUrl) {
        await storage.delete(existingTable.qrcodeImageUrl);
      }
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
