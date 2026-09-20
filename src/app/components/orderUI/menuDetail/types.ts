export interface Addon {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface AddonCategory {
  id: number;
  name: string;
  isRequired: boolean;
  addons: Addon[];
}

export interface MenuDetail {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl: string | null;
  quantity: number;
  isAvailable: boolean;
  addonCategories: AddonCategory[];
}

/** Which presentation the item detail is in: the bottom sheet on phones,
 *  the centered dialog on tablet / desktop. Most pieces render slightly
 *  differently in each. */
export type MenuDetailVariant = "sheet" | "dialog";
