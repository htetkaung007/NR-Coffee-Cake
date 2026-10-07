import { requireBackofficeAccess } from "@/app/lib/backofficeContext";
import NewLocation from "./NewLocation";

export default async function NewLocationPage() {
  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "Please sign in to create a location.",
    access: "owner",
  });
  if (!scope) return fallback;

  return <NewLocation />;
}
