import { formatAmountParts } from "../orderFormat";

/**
 * Money on the staff surface (Backoffice, /print, the printed report):
 * "4,500 MMK" in English, "4,500 ကျပ်" in Myanmar — the words come from
 * bo.money in messages/*.json, never a literal. Digits are always 0–9
 * with en-US separators (formatAmountParts) in both languages. CSV
 * exports keep formatAmount ("MMK"). Pure: the caller hands in its
 * translator (useStaffMoney / getStaffMoney).
 */

type StaffMoneyTranslator = (
  key: "amount" | "delta" | "currency",
  values?: { amount: string },
) => string;

type StaffMoney = {
  /** "4,500 MMK" / "4,500 ကျပ်". */
  amount: (amount: number) => string;
  /** "+500 MMK" / "+500 ကျပ်". */
  delta: (amount: number) => string;
  /** The bare word, for a price field's adornment: "MMK" / "ကျပ်". */
  currency: string;
};

export function staffMoney(t: StaffMoneyTranslator): StaffMoney {
  return {
    amount: (amount) => t("amount", { amount: formatAmountParts(amount).value }),
    delta: (amount) => t("delta", { amount: formatAmountParts(amount).value }),
    currency: t("currency"),
  };
}
