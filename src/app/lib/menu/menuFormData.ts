/** The menu form's FormData as plain fields for createMenuSchema — one
 *  reader for both createMenuAction and updateMenuAction. An empty file
 *  input (size 0) means "no new image". */
export function parseMenuFormData(formData: FormData) {
  const imageEntry = formData.get("image");
  return {
    name: formData.get("name"),
    price: formData.get("price"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    isAvailable: formData.get("isAvailable") === "true",
    categoryIds: formData.getAll("categoryIds"),
    addonCategoryIds: formData.getAll("addonCategoryIds"),
    shownLocationIds: formData.getAll("shownLocationIds"),
    image:
      imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null,
  };
}
