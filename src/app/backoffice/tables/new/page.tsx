import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import NewTable from "./NewTable";

export default async function NewTablePage() {
  const { scope, fallback } = await requireBackofficeAccess({
    access: "TABLES_MANAGE",
  });
  if (!scope) return fallback;

  return <NewTable />;
}
