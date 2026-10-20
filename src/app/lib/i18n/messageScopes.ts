import type enMessages from "../../../../messages/en.json";

/** One messages file (en.json / my.json — the same keys, tested). */
type Messages = typeof enMessages;

/**
 * Which part of the messages each surface's client provider gets — the
 * files hold both: the customers' namespaces and the staff's `bo.*`
 * (Backoffice, /print, sign-in). Each side only ships its own words to
 * the browser. Server code (getTranslations) still reads the whole file.
 * Pure.
 */

/** The storefront's client messages: everything but `bo`. */
export function customerClientMessages(messages: Messages): Omit<Messages, "bo"> {
  const { bo, ...customer } = messages;
  void bo;
  return customer;
}

/** The staff surface's client messages: only `bo`. */
export function staffClientMessages(messages: Messages): Pick<Messages, "bo"> {
  return { bo: messages.bo };
}
