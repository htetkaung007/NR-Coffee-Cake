import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";

/**
 * The words a printed voucher (receipt / bill) needs in BOTH languages —
 * the print preview's EN | မြန်မာ toggle switches between them without a
 * reload. Read here on the server and passed down as props, so the
 * browser gets these two small namespaces, never the whole files.
 */
export const VOUCHER_MESSAGES = {
  en: { bo: { print: en.bo.print, money: en.bo.money } },
  my: { bo: { print: my.bo.print, money: my.bo.money } },
};

export type VoucherMessages = typeof VOUCHER_MESSAGES;
