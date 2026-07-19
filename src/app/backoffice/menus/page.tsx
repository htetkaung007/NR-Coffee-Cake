import Link from "next/link";
import { getServerSession } from "next-auth";
import { AppService } from "@/app/services/app.service";
import { authOptions } from "@/app/utils/config/authOptions";
import { MenuCard } from "@/app/components/MenuCard";

export default async function MenusPage() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId ?? null;
  const menus = companyId ? await AppService.getMenus(companyId) : [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Menus</h1>
        <Link href="/backoffice/menus/new">+ New menu</Link>
      </div>

      {menus.length === 0 ? (
        <p>No menus yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          {menus.map((menu) => (
            <MenuCard key={menu.id} menu={menu} />
          ))}
        </div>
      )}
    </div>
  );
}
