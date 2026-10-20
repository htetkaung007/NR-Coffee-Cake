import { prisma } from "../utils/prisma";
import { ValidationError } from "../lib/errors";
import { LocationService } from "./location.service";

/**
 * The online menu — the owner's per-location switch
 * (Location.onlineMenuEnabled). The online menu IS the customer menu
 * page (/menu?locationId=…): ON, anyone may see it; OFF, only a browser
 * with a QR session here may (lib/storefront/menuAccess, checked on the
 * customer pages and actions). Its own Service: "who can see the menu
 * without scanning" changes for its own reasons, apart from a location's
 * record (LocationService) and which menus show where
 * (MenuLocationService). Ordering never depends on it — sending always
 * needs the QR session.
 */
export class OnlineMenuService {
  /** The owner's switch. Ownership via getCompanyLocation (another
   *  company's location is the same NotFoundError as a missing one).
   *  Switching ON a closed (archived) location is refused; switching it
   *  off always works. */
  static async setOnlineMenu(input: {
    locationId: number;
    companyId: number;
    enabled: boolean;
  }) {
    const location = await LocationService.getCompanyLocation(
      input.locationId,
      input.companyId,
    );
    if (input.enabled && location.isArchived) {
      throw new ValidationError(
        "Closed locations can't show an online menu",
        "LOCATION_CLOSED",
      );
    }
    return prisma.location.update({
      where: { id: location.id },
      data: { onlineMenuEnabled: input.enabled },
      select: { id: true, onlineMenuEnabled: true },
    });
  }
}
