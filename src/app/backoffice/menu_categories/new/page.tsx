import { requireBackofficeAccess } from "@/app/lib/backofficeContext";
import NewMenuCategories from "./NewMenuCategories";

export default async function NewMenuCategoriesPage() {
  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "Please sign in to create a category.",
    access: "owner",
  });
  if (!scope) return fallback;

  return <NewMenuCategories />;
}
