import { prisma } from "../utils/prisma";
import { NotFoundError } from "../lib/errors";

import { AppService } from "./app.service";

/** The Company's own record. Kept apart from AppService (sign-up,
 *  onboarding) per Rule 14: reading or renaming the company is its own
 *  reason to change. */
export class CompanyService {
  /** Chain lookup — the company's name (print headers, Settings). */
  static async getName(companyId: number) {
    const company = await prisma.company.findFirst({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundError("Company", companyId);
    return company.name;
  }

  /** Chain lookup — the company of the user with this email (the
   *  Backoffice layout and the sign-in callback). */
  static async getByUserEmail(email: string) {
    const user = await AppService.getUserByEmail(email);
    if (!user) throw new NotFoundError("User", email);
    const company = await prisma.company.findFirst({
      where: { id: user.companyId },
    });
    if (!company) throw new NotFoundError("Company for user", email);
    return company;
  }

  /** Does one thing: renames the company. The name arrives already
   *  normalised (companyNameSchema at the action boundary). */
  static async updateName(companyId: number, name: string) {
    const { count } = await prisma.company.updateMany({
      where: { id: companyId },
      data: { name },
    });
    if (count === 0) throw new NotFoundError("Company", companyId);
    return { name };
  }
}
