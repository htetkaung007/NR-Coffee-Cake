import type { Prisma } from "../../../prisma/generated/client";

/** A menu's MAIN photo only (MenuImage position 0) — what every card,
 *  order line, receipt and thumbnail shows. Read it as
 *  `menu.menuImages` and turn it into a URL with lib/storage/assetUrl's
 *  mainImageUrl; the key itself never leaves the server. */
export const MAIN_MENU_IMAGE = {
  where: { position: 0 },
  select: { imageKey: true },
} satisfies Prisma.Menu$menuImagesArgs;

/** EVERY photo of a menu, in order — the menu detail (carousel) and the
 *  edit form. Turn the rows into URLs with lib/storage/assetUrl's
 *  toMenuImages. */
export const MENU_IMAGES = {
  orderBy: { position: "asc" },
  select: { id: true, imageKey: true, position: true },
} satisfies Prisma.Menu$menuImagesArgs;
