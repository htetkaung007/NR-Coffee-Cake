import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import NewLocation from "./NewLocation";

export default async function NewLocationPage() {
  const { scope, fallback } = await requireBackofficeAccess({
    access: "owner",
  });
  if (!scope) return fallback;

  return <NewLocation />;
}
