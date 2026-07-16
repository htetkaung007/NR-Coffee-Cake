import { User as NextAuthUser } from "next-auth";
import { prisma } from "@/utils/prisma";
import { Prisma } from "../../prisma/generated/client";

// Transaction-scoped Prisma client type, used by the private setup helpers below.
type Tx = Prisma.TransactionClient;

export class AppService {
  // ---------------------------------------------------------------------
  // User
  // ---------------------------------------------------------------------

  /** Optional lookup — caller decides what to do if no user exists. */
  static async getUserByEmail(email: string) {
    return prisma.user.findFirst({ where: { email } });
  }

  static async getCompanyIdByEmail(email: string) {
    const user = await this.getUserByEmail(email); // reuse instead of re-querying
    return user?.companyId ?? null;
  }

  // ---------------------------------------------------------------------
  // Default setup (transactional)
  // Each step is its own function so it can be tested and read independently.
  // The public entry point (createDefaultSetup) reads top-to-bottom like a
  // newspaper headline; the details live in the private helpers below it.
  // ---------------------------------------------------------------------

  static async createDefaultSetup(nextUser: NextAuthUser) {
    return prisma.$transaction(async (tx) => {
      const company = await this.createDefaultCompany(tx);
      const user = await this.createUserForCompany(tx, nextUser, company.id);
      const menu = await this.createDefaultMenu(tx, company.id);
      await this.createDefaultAddons(tx, menu.id);
      const location = await this.createDefaultLocation(
        tx,
        company.id,
        user.id,
      );
      const table = await this.createDefaultTable(tx, location.id);

      return { user, company, location, table };
    });
  }

  private static createDefaultCompany(tx: Tx) {
    return tx.company.create({ data: { name: "Default Company" } });
  }

  private static createUserForCompany(
    tx: Tx,
    nextUser: NextAuthUser,
    companyId: number,
  ) {
    const { name, email } = nextUser;
    return tx.user.create({
      data: { name: String(name), email: String(email), companyId },
    });
  }

  private static async createDefaultMenu(tx: Tx, companyId: number) {
    const menuCategory = await tx.menuCategory.create({
      data: { name: "Default MenuCategory", companyId },
    });

    const menu = await tx.menu.create({
      data: { name: "Default Menu", price: 100, assetUrl: "" },
    });

    await tx.menuMenuCategory.create({
      data: { menuId: menu.id, menuCategoryId: menuCategory.id },
    });

    return menu;
  }

  private static async createDefaultAddons(tx: Tx, menuId: number) {
    const addonCategory = await tx.addonCategories.create({
      data: { name: "Default Addon Category" },
    });

    await tx.menuAddonCategories.create({
      data: { menuId, addonCategoryId: addonCategory.id },
    });

    const addonNames = ["Default Addon1", "Default Addon2", "Default Addon3"];
    await tx.addon.createMany({
      data: addonNames.map((name) => ({
        name,
        addonCategoryId: addonCategory.id,
        price: 10,
      })),
    });
  }

  private static async createDefaultLocation(
    tx: Tx,
    companyId: number,
    userId: number,
  ) {
    const location = await tx.loaction.create({
      data: { name: "Default Location", companyId },
    });

    await tx.selectedLocation.create({
      data: { userId, locationId: location.id },
    });

    return location;
  }

  private static createDefaultTable(tx: Tx, locationId: number) {
    return tx.tabel.create({
      data: { name: "Default Table", locationId, qrcodeImageUrl: "" },
    });
  }

  // ---------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------

  static async getMenuCategories(companyId: number) {
    return prisma.menuCategory.findMany({
      where: { companyId, isArchived: false },
      orderBy: { id: "asc" },
    });
  }

  static async getMenus(companyId: number) {
    const categories = await this.getMenuCategories(companyId);
    const categoryIds = categories.map((category) => category.id);

    const links = await prisma.menuMenuCategory.findMany({
      where: { menuCategoryId: { in: categoryIds } },
    });
    const menuIds = links.map((link) => link.menuId);

    return prisma.menu.findMany({
      where: { id: { in: menuIds }, isArchived: false },
      include: { disableLocationMenus: true },
    });
  }

  static async getMenusByCategories(categoryIds: number[]) {
    const links = await prisma.menuMenuCategory.findMany({
      where: { menuCategoryId: { in: categoryIds } },
    });
    const menuIds = links.map((link) => link.menuId);

    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds }, isArchived: false },
      include: { disableLocationMenus: true },
    });

    const disabledMenus = await prisma.disableLocationMenus.findMany({
      where: { menuId: { in: menuIds } },
    });
    const disabledMenuIds = new Set(disabledMenus.map((d) => d.menuId));

    return menus.filter((menu) => !disabledMenuIds.has(menu.id));
  }

  // ---------------------------------------------------------------------
  // Addons
  // ---------------------------------------------------------------------

  static async getAddonCategories(companyId: number) {
    const menus = await this.getMenus(companyId);
    const menuIds = menus.map((menu) => menu.id);

    const links = await prisma.menuAddonCategories.findMany({
      where: { menuId: { in: menuIds } },
    });
    const addonCategoryIds = links.map((link) => link.addonCategoryId);

    return prisma.addonCategories.findMany({
      where: { id: { in: addonCategoryIds }, isArchived: false },
    });
  }

  static async getAddons(companyId: number) {
    const categories = await this.getAddonCategories(companyId);
    const categoryIds = categories.map((category) => category.id);

    return prisma.addon.findMany({
      where: { addonCategoryId: { in: categoryIds }, isArchived: false },
      orderBy: { id: "asc" },
    });
  }

  // ---------------------------------------------------------------------
  // Locations & Tables
  // ---------------------------------------------------------------------

  static async getLocations(companyId: number) {
    return prisma.loaction.findMany({
      where: { companyId, isArchived: false },
      orderBy: { id: "asc" },
    });
  }

  static async getSelectedLocation(userId: number) {
    return prisma.selectedLocation.findFirst({
      where: { userId },
      orderBy: { id: "asc" },
    });
  }

  static async getTables(companyId: number) {
    const locations = await this.getLocations(companyId);
    const locationIds = locations.map((location) => location.id);

    return prisma.tabel.findMany({
      where: { locationId: { in: locationIds }, isArchived: false },
      orderBy: { id: "asc" },
    });
  }

  static async getSelectedLocationTables(locationId: number) {
    return prisma.tabel.findMany({ where: { locationId } });
  }

  static async getDisabledLocationMenus(selectedLocationId: number) {
    return prisma.disableLocationMenus.findMany({
      where: { locationsId: selectedLocationId },
    });
  }

  // ---------------------------------------------------------------------
  // Order app
  // Chain lookups: each step depends on the previous one existing, so we
  // fail fast with a descriptive error instead of silently returning null
  // and letting a downstream step crash with a vague message.
  // ---------------------------------------------------------------------

  static async getCompanyByTableId(tableId: number) {
    const table = await prisma.tabel.findFirst({ where: { id: tableId } });
    if (!table) throw new Error(`Table not found: ${tableId}`);

    const location = await prisma.loaction.findFirst({
      where: { id: table.locationId },
    });
    if (!location) {
      throw new Error(`Location not found for table: ${tableId}`);
    }

    const company = await prisma.company.findFirst({
      where: { id: location.companyId },
    });
    if (!company) {
      throw new Error(`Company not found for location: ${location.id}`);
    }

    return company;
  }

  static async getOrderAppMenuCategories(tableId: number) {
    const company = await this.getCompanyByTableId(tableId);

    const table = await prisma.tabel.findFirst({ where: { id: tableId } });
    const location = await prisma.loaction.findFirst({
      where: { id: table?.locationId },
    });

    const menuCategories = await prisma.menuCategory.findMany({
      where: { companyId: company.id, isArchived: false },
      orderBy: { id: "asc" },
      include: { menuMenuCategory: true },
    });

    const disabledCategories =
      await prisma.disableLocationMenuCategories.findMany({
        where: { locationsId: location?.id },
      });

    // Bug fix: the original code only compared against
    // disableLocationMenuCategories[0], so only the first disabled
    // category was ever filtered out. A Set checked against every
    // disabled id fixes that.
    const disabledCategoryIds = new Set(
      disabledCategories.map((d) => d.menuCategoryId),
    );

    return menuCategories.filter(
      (category) => !disabledCategoryIds.has(category.id),
    );
  }
}
