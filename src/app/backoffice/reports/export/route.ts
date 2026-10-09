import { NextRequest } from "next/server";
import { AppError } from "@/app/lib/errors";
import {
  buildCancelledLineRows,
  buildLineRows,
  cancelledLinesCsv,
  exportFileName,
  linesCsv,
} from "@/app/lib/report/exportLines";
import { reportExportInputSchema } from "@/app/lib/schemas/reportSchema";
import {
  requirePermission,
  withSelectedLocation,
} from "@/app/lib/access/roleGuard";
import type { LocatedScope, StaffScope } from "@/app/lib/access/rolePolicy";
import { ReportService } from "@/app/services";

const plain = (status: number, message: string) =>
  new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

/**
 * The Reports page's CSV downloads for the period on screen:
 *   GET ?type=lines|cancelled&period=week|month&day=YYYY-MM-DD
 * (type defaults to lines). REPORTS_VIEW, like the page. The company and
 * location come from the session — never the query string. Everything in
 * the file goes through exportLines + csv.ts (every text cell guarded
 * against formula injection). Signed-out requests never get here: the
 * middleware sends them to sign-in.
 */
export async function GET(request: NextRequest) {
  // The same check as the Reports page and actions: the owner, or a
  // manager granted REPORTS_VIEW (read from the database each time).
  let scope: StaffScope;
  try {
    scope = await requirePermission("REPORTS_VIEW");
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      return plain(401, "Please sign in.");
    }
    if (error instanceof AppError) return plain(403, error.message);
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const parsed = reportExportInputSchema.safeParse({
    type: searchParams.get("type") ?? undefined,
    kind: searchParams.get("period") ?? undefined,
    anchorDay: searchParams.get("day") ?? undefined,
  });
  if (!parsed.success) return plain(400, "This export link isn't valid.");
  const { type, kind, anchorDay } = parsed.data;

  try {
    let located: LocatedScope;
    try {
      located = await withSelectedLocation(scope);
    } catch (error) {
      if (error instanceof AppError && error.code === "NO_SELECTED_LOCATION") {
        return plain(400, error.message);
      }
      throw error;
    }
    const exportScope = {
      companyId: located.companyId,
      locationId: located.locationId,
      kind,
      anchorDay,
    };

    let body: string;
    let fileName: string;
    if (type === "lines") {
      const { period, bills } = await ReportService.getExportLines(exportScope);
      body = linesCsv(buildLineRows(bills));
      fileName = exportFileName("lines", period);
    } else {
      const { period, rounds } =
        await ReportService.getExportCancelled(exportScope);
      body = cancelledLinesCsv(buildCancelledLineRows(rounds));
      fileName = exportFileName("cancelled", period);
    }

    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // ASCII-only name (exportFileName), so no filename* is needed.
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // Only an AppError's message is safe to show (Rule 6).
    if (error instanceof AppError) return plain(400, error.message);
    console.error("[reports/export] Unhandled error:", error);
    return plain(500, "Something went wrong. Please try again.");
  }
}
