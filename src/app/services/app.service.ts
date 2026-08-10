import bcrypt from "bcryptjs";
import { Prisma } from "../../../prisma/generated/client";
import { prisma } from "../utils/prisma";
import { NotFoundError, ValidationError } from "../lib/errors";
import { MenuService } from "./menu_menuCategory.service";
import { LocationService } from "./location.service";

// Transaction-scoped Prisma client type, used by the private setup helpers below.
type Tx = Prisma.TransactionClient;

// AppService ကိုယ်တိုင်ရဲ့ own input shape — NextAuth ရဲ့ User type ကို
// တိုက်ရိုက် မသုံးတော့ဘူး (Boundaries: Service layer က third-party auth
// library ရဲ့ type ကို မမှီခိုသင့်ဘူး, NextAuth ကနေရော, register form
// ကနေရော ၂ နေရာစလုံးက ခေါ်နိုင်ဖို့).
type NewUserInput = { name?: string | null; email: string };

// AppService ရဲ့ method တွေက this.xxx() အစား AppService.xxx() ကို
// အသုံးပြုထားတယ် — ဘာကြောင့်လဲဆိုတော့ toSafeResult(AppService.someMethod)
// လို "function ကို variable ထဲ ခွာထုတ်" တဲ့ pattern ကို actions/*.ts
// file တွေထဲမှာ အမြဲသုံးနေတယ် (Zod/neverthrow pipeline). ဒီလို ခွာထုတ်
// လိုက်တာနဲ့ static method ရဲ့ `this` context ပျောက်သွားမယ် (undefined
// ဖြစ်မယ်) — this.xxx() ခေါ်ထားရင် crash ဖြစ်မယ်, AppService.xxx()
// ခေါ်ထားရင်တော့ ဘယ်လို detach ဖြစ်ဖြစ် အမြဲ အလုပ်လုပ်မယ်.
export class AppService {
  // ---------------------------------------------------------------------
  // User
  // ---------------------------------------------------------------------

  /** Optional lookup — caller decides what to do if no user exists. */
  static async getUserByEmail(email: string) {
    return prisma.user.findFirst({ where: { email } });
  }

  static async getCompanyByEmail(email: string) {
    const user = await AppService.getUserByEmail(email); // reuse instead of re-querying
    if (!user) throw new NotFoundError("User", email);
    const company = await prisma.company.findFirst({
      where: { id: user.companyId },
    });
    if (!company) throw new NotFoundError("Company for user", email);
    return company;
  }

  // ---------------------------------------------------------------------
  // Default setup (transactional)
  // Each step is its own function so it can be tested and read independently.
  // The public entry point (createDefaultSetup) reads top-to-bottom like a
  // newspaper headline; the details live in the private helpers below it.
  // ---------------------------------------------------------------------

  static async createDefaultSetup(nextUser: NewUserInput, password?: string) {
    return prisma.$transaction(async (tx) => {
      const company = await AppService.createDefaultCompany(tx);
      const user = await AppService.createUserForCompany(
        tx,
        nextUser,
        company.id,
        password,
      );
      const menu = await AppService.createDefaultMenu(tx, company.id);
      await AppService.createDefaultAddons(tx, menu.id);
      const location = await AppService.createDefaultLocation(
        tx,
        company.id,
        user.id,
      );
      // MenuStock needs both menuId and locationId, so this must come
      // after createDefaultLocation, not alongside createDefaultMenu.
      await AppService.createDefaultMenuStock(tx, menu.id, location.id);
      const table = await AppService.createDefaultTable(tx, location.id);

      return { user, company, location, table };
    });
  }

  /**
   * Credentials (email/password) sign-up. Google OAuth doesn't go through
   * here — NextAuth's signIn callback calls createDefaultSetup directly.
   * This is the missing "create" half of the Credentials flow: authorize()
   * only ever reads (getUserByEmail); this is where a new row gets written.
   */
  static async registerUser(input: {
    name: string;
    email: string;
    password: string;
  }) {
    const existingUser = await AppService.getUserByEmail(input.email);
    if (existingUser) {
      throw new ValidationError("Email is already registered.");
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    return AppService.createDefaultSetup(
      { name: input.name, email: input.email },
      hashedPassword,
    );
  }

  /**
   * Admin-only flow: creates a Manager account fixed to one location.
   * Unlike registerUser (which bootstraps a whole new Company),
   * this attaches to the Admin's *existing* company and location —
   * no createDefaultCompany/createDefaultLocation involved.
   *
   * Also seeds a MenuStock row (quantity 0) at that location for every
   * menu the company already has, rather than creating a placeholder
   * "Default Menu": a brand-new branch should start with the same menu
   * the rest of the company sells (just not stocked yet), not an empty
   * menu the Manager has to rebuild from scratch. skipDuplicates guards
   * against a stock row that might already exist for this
   * menu+location pair (e.g. Admin previously stocked ahead of hiring
   * a Manager for this branch).
   */
  static async createManagerForLocation(input: {
    email: string;
    password: string;
    companyId: number;
    locationId: number;
  }) {
    const existingUser = await AppService.getUserByEmail(input.email);
    if (existingUser) {
      throw new ValidationError("Email is already registered.");
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const companyMenus = await MenuService.getMenus(input.companyId);

    return prisma.$transaction(async (tx) => {
      const manager = await AppService.createUserForCompany(
        tx,
        { email: input.email },
        input.companyId,
        hashedPassword,
        "MANAGER",
        input.locationId,
      );

      if (companyMenus.length > 0) {
        await tx.menuStock.createMany({
          data: companyMenus.map((menu) => ({
            menuId: menu.id,
            locationId: input.locationId,
            quantity: 0,
          })),
          skipDuplicates: true,
        });
      }

      return manager;
    });
  }

  static async verifyCredentials(email: string, password: string) {
    const user = await AppService.getUserByEmail(email);
    if (!user || !user.password) return null; // no account, or Google-only account (no password set)

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return null;

    return user;
  }
  private static createDefaultCompany(tx: Tx) {
    return tx.company.create({ data: { name: "Default Company" } });
  }

  private static createUserForCompany(
    tx: Tx,
    nextUser: NewUserInput,
    companyId: number,
    password?: string,
    role: "ADMIN" | "MANAGER" = "ADMIN",
    locationId?: number,
  ) {
    const { name, email } = nextUser;
    return tx.user.create({
      data: {
        name: name ? String(name) : null,
        email: String(email),
        companyId,
        role,
        ...(locationId ? { locationId } : {}),
        ...(password ? { password } : {}),
      },
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
    const location = await tx.location.create({
      data: { name: "Default Location", companyId },
    });

    await tx.selectedLocation.create({
      data: { userId, locationId: location.id },
    });

    return location;
  }

  private static createDefaultTable(tx: Tx, locationId: number) {
    return tx.table.create({
      data: { name: "Default Table", locationId, qrcodeImageUrl: "" },
    });
  }

  /** New menus start with 1 in stock so the default card is orderable
   *  right away instead of showing "sold out" before staff ever restock. */
  private static createDefaultMenuStock(
    tx: Tx,
    menuId: number,
    locationId: number,
  ) {
    return tx.menuStock.create({
      data: { menuId, locationId, quantity: 1 },
    });
  }

  // ---------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------
  // Addons
  // Menu core reads/DTOs live in menu.service.ts now (Rule 14 split) —
  // Addons stays here since it's an adjacent-but-separate domain.
  // ---------------------------------------------------------------------

  static async getAddonCategories(companyId: number) {
    const menus = await MenuService.getMenus(companyId);
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
    const categories = await AppService.getAddonCategories(companyId);
    const categoryIds = categories.map((category) => category.id);

    return prisma.addon.findMany({
      where: { addonCategoryId: { in: categoryIds }, isArchived: false },
      orderBy: { id: "asc" },
    });
  }
  static async getCompanyNameByCompanyId(companyId: number) {
    const company = await prisma.company.findFirst({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundError("Company", companyId);
    return company.name;
  }

  // ---------------------------------------------------------------------
  // Locations & Tables
  // ---------------------------------------------------------------------

  /**
   * Managers have a fixed location (User.locationId) and never touch
   * SelectedLocation at all — there's nothing to switch between, so
   * their "selected" location is just whatever they're locked to.
   * Admins go through the normal SelectedLocation table, since they
   * can switch between any of the company's locations. Both paths
   * return the same shape ({ locationId, ... }) so callers like
   * getMenusWithDetails(companyId, selectedLocation.locationId) work
   * unchanged regardless of which role called this.
   */
  /**
   * Admin-only: switches the Admin's active location. Managers can't
   * call this — their location is fixed via User.locationId (see
   * getSelectedLocation) and isn't meant to change from this page.
   * Upserts on the @@unique([userId]) constraint so an Admin always
   * has exactly one active location, never zero or two.
   */
  static async setSelectedLocation(userId: number, locationId: number) {
    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundError("User", String(userId));
    if (user.role === "MANAGER") {
      throw new ValidationError(
        "Managers can't switch locations — contact your Admin.",
      );
    }

    return prisma.selectedLocation.upsert({
      where: { userId },
      update: { locationId },
      create: { userId, locationId },
    });
  }

  static async getSelectedLocation(userId: number) {
    const user = await prisma.user.findFirst({ where: { id: userId } });

    if (user?.role === "MANAGER") {
      if (!user.locationId) return null; // Manager not yet assigned a location
      return { locationId: user.locationId };
    }

    return prisma.selectedLocation.findFirst({
      where: { userId },
      orderBy: { id: "asc" },
    });
  }

  static async getTables(companyId: number) {
    const locations = await LocationService.getActiveLocations(companyId);
    const locationIds = locations.map((location) => location.id);

    return prisma.table.findMany({
      where: { locationId: { in: locationIds }, isArchived: false },
      orderBy: { id: "asc" },
    });
  }

  static async getSelectedLocationTables(locationId: number) {
    return prisma.table.findMany({ where: { locationId } });
  }

  static async getDisabledLocationMenus(selectedLocationId: number) {
    return prisma.disableLocationMenus.findMany({
      where: { locationId: selectedLocationId },
    });
  }
  static async getCompanyNameByUserId(userId: number) {
    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundError("User", userId);
    const company = await prisma.company.findFirst({
      where: { id: user.companyId },
    });
    if (!company) throw new NotFoundError("Company for user", userId);
    return company.name;
  }
  // ---------------------------------------------------------------------
  // Order app
  // Chain lookups: each step depends on the previous one existing, so we
  // fail fast with a descriptive error instead of silently returning null
  // and letting a downstream step crash with a vague message.
  // ---------------------------------------------------------------------

  static async getCompanyByTableId(tableId: number) {
    const table = await prisma.table.findFirst({ where: { id: tableId } });
    if (!table) throw new NotFoundError("Table", tableId);

    const location = await prisma.location.findFirst({
      where: { id: table.locationId },
    });
    if (!location) throw new NotFoundError("Location for table", tableId);

    const company = await prisma.company.findFirst({
      where: { id: location.companyId },
    });
    if (!company) throw new NotFoundError("Company for location", location.id);

    return company;
  }

  static async getOrderAppMenuCategories(tableId: number) {
    const company = await AppService.getCompanyByTableId(tableId);

    const table = await prisma.table.findFirst({ where: { id: tableId } });
    const location = await prisma.location.findFirst({
      where: { id: table?.locationId },
    });

    const menuCategories = await prisma.menuCategory.findMany({
      where: { companyId: company.id, isArchived: false },
      orderBy: { id: "asc" },
      include: { menuMenuCategory: true },
    });

    const disabledCategories =
      await prisma.disableLocationMenuCategories.findMany({
        where: { locationId: location?.id },
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
