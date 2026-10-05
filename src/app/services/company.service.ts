import { prisma } from "../utils/prisma";
import { NotFoundError } from "../lib/errors";

/** The Company's own record. Kept apart from AppService (sign-up,
 *  onboarding, users, add-on reads) per Rule 14: "the company was
 *  renamed" is its own reason to change. */
export class CompanyService {
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
