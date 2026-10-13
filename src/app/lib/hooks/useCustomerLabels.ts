"use client";

import { useTranslations } from "next-intl";
import type { VoidReason } from "../../../../prisma/generated/enums";
import { isCustomerRoundStatus } from "@/app/lib/i18n/customerEnums";
import {
  contributorMessages,
  type ContributorWho,
} from "@/app/lib/order/contributors";

/** The customer-side words for enum values (voidReason / roundStatus in
 *  messages/*.json) — the Backoffice keeps its own English labels.
 *  Storefront only. */
export function useCustomerLabels() {
  const tVoid = useTranslations("voidReason");
  const tStatus = useTranslations("roundStatus");
  const tWho = useTranslations("contributor");
  return {
    /** "You", "Customer 2", "Shared". */
    contributorLabel: (who: ContributorWho) => {
      const { label, values } = contributorMessages(who);
      return tWho(label, values);
    },
    /** "Your order", "Customer 2 order", "Shared order". */
    contributorHeading: (who: ContributorWho) => {
      const { heading, values } = contributorMessages(who);
      return tWho(heading, values);
    },
    voidReasons: (reasons: readonly VoidReason[]) =>
      reasons.map((reason) => tVoid(reason)).join(", "),
    /** An unknown status (never expected) shows as it is. */
    roundStatus: (status: string) =>
      isCustomerRoundStatus(status) ? tStatus(status) : status,
  };
}
