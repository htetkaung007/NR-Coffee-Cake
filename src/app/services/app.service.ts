import bcrypt from "bcryptjs";
import { Prisma } from "../../../prisma/generated/client";
import { prisma } from "../utils/prisma";
import { AppError, ValidationError } from "../lib/errors";
import { SIGNUP_CLOSED_MESSAGE } from "../lib/access/signUp";

// Transaction-scoped Prisma client type, used by the private setup helpers below.
type Tx = Prisma.TransactionClient;

// AppService ကိုယ်တိုင်ရဲ့ own input shape — NextAuth ရဲ့ User type ကို
// တိုက်ရိုက် မသုံးတော့ဘူး (Boundaries: Service layer က third-party auth
// library ရဲ့ type ကို မမှီခိုသင့်ဘူး, NextAuth ကနေရော, register form
// ကနေရော ၂ နေရာစလုံးက ခေါ်နိုင်ဖို့).
type NewUserInput = { name?: string | null; email: string };

function signUpClosedError() {
  return new AppError(SIGNUP_CLOSED_MESSAGE, "SIGNUP_CLOSED");
}

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

  // ---------------------------------------------------------------------
  // Single-shop mode: sign-up opens only while no company exists
  // ---------------------------------------------------------------------

  /** True only while there are zero Company rows — the first owner may
   *  still sign up. Display only for the auth pages; the real check is
   *  inside createDefaultSetup's transaction. */
  static async isSignUpOpen() {
    return (await prisma.company.count()) === 0;
  }

  // ---------------------------------------------------------------------
  // Default setup (transactional)
  // Each step is its own function so it can be tested and read independently.
  // The public entry point (createDefaultSetup) reads top-to-bottom like a
  // newspaper headline; the details live in the private helpers below it.
  // ---------------------------------------------------------------------

  /**
   * Creates the shop: the company, its owner and the default menu,
   * location and table. THE one door both sign-up paths go through
   * (registerUser for the form, ensureDefaultSetup for a new Google
   * email), so it enforces "sign-up only while no company exists"
   * itself, in the same transaction that creates the company.
   * Serializable: two first sign-ups racing each other can't both see
   * zero companies — the loser fails with P2034, reported as
   * SIGNUP_CLOSED.
   */
  static async createDefaultSetup(nextUser: NewUserInput, password?: string) {
    try {
      return await prisma.$transaction(
        (tx) => AppService.createDefaultSetupIn(tx, nextUser, password),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw signUpClosedError();
      }
      throw error;
    }
  }

  private static async createDefaultSetupIn(
    tx: Tx,
    nextUser: NewUserInput,
    password?: string,
  ) {
    if ((await tx.company.count()) > 0) throw signUpClosedError();

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
    // Checked first, so a closed sign-up never says whether an email is
    // registered (and skips the hash); createDefaultSetup checks again.
    if (!(await AppService.isSignUpOpen())) throw signUpClosedError();

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

  /** Shared with ManagerService.createManagerForLocation — the one
   *  place a User row is created. */
  static createUserForCompany(
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
}
