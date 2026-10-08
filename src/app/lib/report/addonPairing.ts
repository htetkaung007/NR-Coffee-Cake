import type { ReportLine } from "./itemReport";
import { percentOf } from "./percent";

/** A menu needs at least this many units sold before its add-on habits
 *  are worth reading — below it the report only says how far along it is. */
export const MIN_PAIRING_UNITS = 10;

/** How many add-ons are listed for one menu. */
export const TOP_PAIRS = 3;

export interface MenuAddonPair {
  addonId: number;
  /** Units of this menu that had the add-on. */
  units: number;
  /** units ÷ the menu's units, as a whole percent. */
  rate: number;
}

export interface MenuPairing {
  /** Units of this menu sold (Σ quantity of its lines) — returned even
   *  below the minimum, for "6 / 10 sold so far". */
  units: number;
  status: "ok" | "notEnough";
  /** The TOP_PAIRS add-ons most often chosen with this menu; empty when
   *  notEnough. */
  pairs: MenuAddonPair[];
}

export interface AddonMenuPair {
  menuId: number;
  /** Units of that menu that had this add-on. */
  units: number;
  /** units ÷ that menu's units, as a whole percent. */
  rate: number;
}

export interface Pairing {
  byMenu: Record<number, MenuPairing>;
  /** For each add-on: the menus (that reached the minimum) it was
   *  chosen with, highest rate first. */
  byAddon: Record<number, { menus: AddonMenuPair[] }>;
}

/** Per menu: its units, and per add-on the units that had it. Add-ons
 *  from required groups are left out; an add-on counts once per line
 *  however often it's listed. */
function countUnits(lines: readonly ReportLine[]) {
  const units = new Map<number, number>();
  const pairUnits = new Map<number, Map<number, number>>();
  for (const line of lines) {
    units.set(line.menuId, (units.get(line.menuId) ?? 0) + line.quantity);
    const optional = new Set(
      line.addons.filter((a) => !a.isRequiredGroup).map((a) => a.addonId),
    );
    const menuPairs = pairUnits.get(line.menuId) ?? new Map<number, number>();
    for (const addonId of optional) {
      menuPairs.set(addonId, (menuPairs.get(addonId) ?? 0) + line.quantity);
    }
    pairUnits.set(line.menuId, menuPairs);
  }
  return { units, pairUnits };
}

/** Highest rate first; equal rates by more units, then lower id. */
const byStrength = (a: MenuAddonPair, b: MenuAddonPair) =>
  b.rate - a.rate || b.units - a.units || a.addonId - b.addonId;

const byMenuStrength = (a: AddonMenuPair, b: AddonMenuPair) =>
  b.rate - a.rate || b.units - a.units || a.menuId - b.menuId;

/**
 * Which add-ons go with which menus, from the paid order lines of ONE
 * calendar month — the caller loads them for periodFor("month", day),
 * range from periodRangeUtc (see reportPeriod.ts); there is no rolling
 * window. Add-ons from REQUIRED groups (a size, say) are left out
 * entirely: every unit has one, so they say nothing about preference.
 * Rates compare a menu's own units, so a small menu can rank above a
 * big one. byMenu lists each menu's TOP_PAIRS; byAddon lists every
 * menu (that reached the minimum) the add-on went with.
 */
export function buildPairing(lines: readonly ReportLine[]): Pairing {
  const { units, pairUnits } = countUnits(lines);
  const byMenu: Record<number, MenuPairing> = {};
  const menusByAddon = new Map<number, AddonMenuPair[]>();

  for (const [menuId, menuUnits] of units) {
    if (menuUnits < MIN_PAIRING_UNITS) {
      byMenu[menuId] = { units: menuUnits, status: "notEnough", pairs: [] };
      continue;
    }
    const pairs: MenuAddonPair[] = [...(pairUnits.get(menuId) ?? [])]
      .map(([addonId, addonUnits]) => ({
        addonId,
        units: addonUnits,
        rate: percentOf(addonUnits, menuUnits),
      }))
      .sort(byStrength);
    byMenu[menuId] = {
      units: menuUnits,
      status: "ok",
      pairs: pairs.slice(0, TOP_PAIRS),
    };

    for (const pair of pairs) {
      const menus = menusByAddon.get(pair.addonId) ?? [];
      menus.push({ menuId, units: pair.units, rate: pair.rate });
      menusByAddon.set(pair.addonId, menus);
    }
  }

  const byAddon: Pairing["byAddon"] = {};
  for (const [addonId, menus] of menusByAddon) {
    byAddon[addonId] = { menus: menus.sort(byMenuStrength) };
  }
  return { byMenu, byAddon };
}
