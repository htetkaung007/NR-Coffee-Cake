"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { requirePermission } from "@/app/lib/access/roleGuard";
import {
  createTableSchema,
  updateTableSchema,
  type CreateTableInput,
  type UpdateTableInput,
} from "@/app/lib/schemas/tableSchema";
import { getFileStorageService } from "@/app/lib/storage/getFileStorageService";

import { TableService } from "@/app/services";

const safeCreateTable = toSafeResult(async (input: CreateTableInput) => {
  // Same "which location am I working in" lookup Menu creation uses —
  // Admins get their SelectedLocation, Managers get their fixed
  // User.locationId. See LocationService.getSelectedLocation.
  const { locationId } = await requirePermission("TABLES_MANAGE", {
    withLocation: true,
  });

  const table = await TableService.createTable(
    locationId,
    input.name,
    input.isCounter,
  );

  // input.logo is already validated by createTableSchema (size + mime
  // type) before this ever runs. Passing null when no logo was given
  // lets generateQrCodeWithLogo fall back to the default table icon.
  const logoBuffer = input.logo
    ? Buffer.from(await input.logo.arrayBuffer())
    : null;
  await TableService.regenerateQrImage(table, logoBuffer);

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
    // The table must be the company's — and, for a manager, at their
    // own location (TableService.getTableById).
    const scope = await requirePermission("TABLES_MANAGE", {
      withLocation: true,
    });

    const table = await TableService.updateTableName(
      input.tableId,
      scope,
      input.name,
    );

    // Logo is optional on edit too — only touch the QR code at all if
    // the user actually picked a new file this time. QR *content* (the
    // URL) never changes on edit — it's built from locationId +
    // tableId, neither of which this action can change. Only the
    // *image* (logo baked into the PNG) needs regenerating, so
    // already-printed QR codes with the old logo still scan to the
    // same place; only their look goes stale until reprinted.
    if (input.logo) {
      const logoBuffer = Buffer.from(await input.logo.arrayBuffer());
      await TableService.regenerateQrImage(table, logoBuffer);
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
  const scope = await requirePermission("TABLES_MANAGE", {
    withLocation: true,
  });

  const table = await TableService.deleteTable(tableId, scope);

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
 * immediately (CounterSessionService.resolveCounterQrScan /
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
  const scope = await requirePermission("TABLES_MANAGE", {
    withLocation: true,
  });

  const rotated = await TableService.rotateAccessKey(tableId, scope);
  await TableService.regenerateQrImage(rotated, null);

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
