import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import NewTable from "./NewTable";

export default async function NewTablePage() {
  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "You must be signed in to create a table.",
    access: "TABLES_MANAGE",
  });
  if (!scope) return fallback;

  return <NewTable />;
}
