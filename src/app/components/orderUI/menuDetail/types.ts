import type { MenuImageView } from "@/app/lib/storage/assetUrl";

/** Shop data names carry an optional Myanmar twin (`nameMy`; null or
 *  absent: the English name shows — lib/i18n/localizedText). */
export interface Addon {
  id: number;
  name: string;
  nameMy?: string | null;
  price: number;
  isAvailable: boolean;
}

export interface AddonCategory {
  id: number;
  name: string;
  nameMy?: string | null;
  isRequired: boolean;
  addons: Addon[];
}

export interface MenuDetail {
  id: number;
  name: string;
  nameMy?: string | null;
  price: number;
  description: string;
  descriptionMy?: string | null;
  /** Every photo, in order (0 = the main one) — 0 to 3 (MenuPhotos). */
  images: MenuImageView[];
  quantity: number;
  isAvailable: boolean;
  addonCategories: AddonCategory[];
}

/** Which presentation the item detail is in: the bottom sheet on phones,
 *  the centered dialog on tablet / desktop. Most pieces render slightly
 *  differently in each. */
export type MenuDetailVariant = "sheet" | "dialog";
