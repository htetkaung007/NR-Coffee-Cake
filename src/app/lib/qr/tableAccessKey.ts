import { randomBytes } from "crypto";

/** Short, URL-safe, unguessable key embedded in a table's (Counter or
 *  regular) printed QR link (e.g. /counter?tableId=5&key=<this> for
 *  Counter, /table?tableId=8&key=<this> for a regular table).
 *  Regenerating it invalidates every previously-printed copy of that
 *  QR at once — see TableService.rotateAccessKey. Every table gets one
 *  when it's created (TableService.createTable, and the sign-up's
 *  Default Table — AppService.createDefaultTable). Server-only. */
export function generateCounterKey() {
  return randomBytes(6).toString("base64url");
}
