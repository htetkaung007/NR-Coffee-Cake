import { prisma } from "../utils/prisma";
import { todayInShop } from "../lib/shopDay";
import { oldestKeptViewDay } from "../lib/menu/menuViews";

/** The shop day the old MenuViewSeen rows were last cleared on (this
 *  server process) — so the clean-up runs at most once a day. */
let lastCleanUpDay: string | null = null;

/**
 * Menu views on customer phones: "one per customer per day" per menu and
 * location (MenuViewSeen dedupes, MenuViewDaily keeps the totals Reports
 * reads). The viewer key comes in already hashed (lib/menu/menuViews) —
 * no raw token, IP or device ever reaches this service or the database.
 */
export class MenuViewService {
  /**
   * Counts one view, in ONE transaction: the MenuViewSeen insert skips a
   * duplicate (the same customer, menu and day — @@unique), and only a
   * new row adds 1 to that day's MenuViewDaily (one INSERT … ON
   * CONFLICT, so two customers' first views of the day never race).
   * A repeat view writes nothing. Then, once a day, the old
   * MenuViewSeen rows go (clearOldSeenRows).
   *
   * The caller passes a menu it has just read at this location (the
   * customer detail), so menuId / locationId are known to exist.
   */
  static async recordView(input: {
    viewerKey: string;
    menuId: number;
    locationId: number;
  }) {
    const day = todayInShop();
    await prisma.$transaction(async (tx) => {
      const seen = await tx.menuViewSeen.createMany({
        data: [{ ...input, day }],
        skipDuplicates: true,
      });
      if (seen.count === 0) return;
      await tx.$executeRaw`
        INSERT INTO "MenuViewDaily" ("menuId", "locationId", "day", "viewers")
        VALUES (${input.menuId}, ${input.locationId}, ${day}, 1)
        ON CONFLICT ("menuId", "locationId", "day")
        DO UPDATE SET "viewers" = "MenuViewDaily"."viewers" + 1`;
    });
    if (lastCleanUpDay !== day) {
      lastCleanUpDay = day;
      await MenuViewService.clearOldSeenRows(day);
    }
  }

  /** Deletes MenuViewSeen rows older than VIEW_SEEN_KEEP_DAYS shop days
   *  (they only dedupe today's views). MenuViewDaily is kept. */
  private static async clearOldSeenRows(today: string) {
    await prisma.menuViewSeen.deleteMany({
      where: { day: { lt: oldestKeptViewDay(today) } },
    });
  }

  /**
   * Viewers per menu at a location over the shop days
   * [firstDay, lastDay] — the sum of MenuViewDaily. `null` when the
   * location has no MenuViewDaily row in those days at all (a period
   * from before views were counted): "—" on screen, never 0. A menu
   * with no row in a counted period is simply absent (0 viewers).
   */
  static async getViewersByMenu(
    locationId: number,
    firstDay: string,
    lastDay: string,
  ): Promise<Map<number, number> | null> {
    const rows = await prisma.menuViewDaily.groupBy({
      by: ["menuId"],
      where: { locationId, day: { gte: firstDay, lte: lastDay } },
      _sum: { viewers: true },
    });
    if (rows.length === 0) return null;
    return new Map(rows.map((row) => [row.menuId, row._sum.viewers ?? 0]));
  }
}
