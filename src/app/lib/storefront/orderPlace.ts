/**
 * Where a customer is ordering from on /menu — the "where am I" line
 * (OrderPlaceHeader). Pure and client-safe; the words themselves are the
 * placeHeader messages (messages/*.json), so this only says WHICH one.
 */

export type OrderPlace =
  | {
      kind: "table";
      tableName: string;
      /** Other people ordering at this table (from the contributor
       *  labels — a count only, never tokens). */
      othersCount: number;
    }
  | {
      kind: "counter";
      orderNumber: string | null;
      /** The bill's last round waits for the counter to accept it. */
      awaitingApproval: boolean;
    }
  | { kind: "online" };

/** The title as a placeHeader message key and its values — or, for a
 *  table whose own name already starts with "Table", that name as it is
 *  (shop data is never translated). */
export type OrderPlaceTitle =
  | { text: string }
  | { key: "yourTable" | "counter" | "online" }
  | { key: "table"; values: { name: string } }
  | { key: "counterOrder"; values: { number: string } };

/**
 * - a table: "Table 5" stays as it is; a bare "5" or "T1" becomes the
 *   `table` message ("Table {name}"); no name at all → "Your table";
 * - the counter: its order number, with or without its "#" —
 *   `counterOrder` ("Order #{number}") — or just "Counter" before
 *   there's one; only the customer-facing number, never an internal
 *   session id;
 * - otherwise the Online menu.
 */
export function orderPlaceTitle(place: OrderPlace): OrderPlaceTitle {
  switch (place.kind) {
    case "table": {
      const name = place.tableName.trim();
      if (name === "") return { key: "yourTable" };
      if (/^table/i.test(name)) return { text: name };
      return { key: "table", values: { name } };
    }
    case "counter": {
      const number = place.orderNumber?.trim().replace(/^#/, "") ?? "";
      return number
        ? { key: "counterOrder", values: { number } }
        : { key: "counter" };
    }
    case "online":
      return { key: "online" };
  }
}
