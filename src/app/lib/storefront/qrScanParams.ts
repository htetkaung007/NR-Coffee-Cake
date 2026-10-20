/**
 * What a printed QR link carries — `?locationId=&tableId=&key=` — read
 * the same way by both QR Route Handlers ((storefront)/counter/route.ts
 * and (storefront)/table/route.ts). Each value is null when it's missing,
 * or (ids) not a non-zero number; a handler treats any null as "not a
 * usable QR scan". Pure.
 */
export interface QrScanParams {
  locationId: number | null;
  tableId: number | null;
  key: string | null;
}

export function readQrScanParams(searchParams: URLSearchParams): QrScanParams {
  return {
    locationId: Number(searchParams.get("locationId")) || null,
    tableId: Number(searchParams.get("tableId")) || null,
    key: searchParams.get("key") || null,
  };
}
