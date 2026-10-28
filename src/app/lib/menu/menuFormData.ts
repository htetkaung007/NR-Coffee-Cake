/** The menu form's FormData as plain fields for createMenuSchema — one
 *  reader for both createMenuAction and updateMenuAction. The photos
 *  come as "imageSlots" (in order) + "newImages" (the files those slots
 *  point at, lib/menu/menuImageSlots); the schema checks both. */
export function parseMenuFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    nameMy: formData.get("nameMy"),
    price: formData.get("price"),
    description: formData.get("description"),
    descriptionMy: formData.get("descriptionMy"),
    quantity: formData.get("quantity"),
    isAvailable: formData.get("isAvailable") === "true",
    categoryIds: formData.getAll("categoryIds"),
    addonCategoryIds: formData.getAll("addonCategoryIds"),
    shownLocationIds: formData.getAll("shownLocationIds"),
    imageSlots: formData.getAll("imageSlots"),
    newImages: formData.getAll("newImages"),
  };
}
