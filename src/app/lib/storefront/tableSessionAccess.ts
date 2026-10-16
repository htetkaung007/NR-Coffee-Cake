import { TableDraftService } from "@/app/services";
import { getContributorToken } from "./contributorToken";
import { parseIdParam } from "./menuAccess";

/** A Table QR session this browser holds: its table, at its location. */
export interface TableSessionPlace {
  tableId: number;
  locationId: number;
  contributorToken: string;
}

/**
 * The /menu and /cart pages' shared first step: the URL's ids (untrusted
 * — parsed with Zod, then looked up, never used as they come) and, when
 * both are there, whether this browser holds a CURRENT contributor token
 * for THAT table at THAT location (a token for a table elsewhere doesn't
 * open this location). `table` is null for anything else — the pages then
 * fall through to the Counter / online path. Server-only.
 */
export async function readTableSessionPlace(params: {
  locationId?: string;
  tableId?: string;
}): Promise<{
  urlLocationId: number | null;
  table: TableSessionPlace | null;
}> {
  const urlLocationId = parseIdParam(params.locationId);
  const tableId = parseIdParam(params.tableId);
  if (tableId === null || urlLocationId === null) {
    return { urlLocationId, table: null };
  }
  const contributorToken = await getContributorToken(tableId);
  const isTableSession =
    contributorToken !== null &&
    (await TableDraftService.hasCurrentTokenAtLocation(urlLocationId, {
      [tableId]: contributorToken,
    }));
  return {
    urlLocationId,
    table:
      contributorToken !== null && isTableSession
        ? { tableId, locationId: urlLocationId, contributorToken }
        : null,
  };
}
