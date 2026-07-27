import Link from "next/link";
import { getServerSession } from "next-auth";
import { AppService } from "@/app/services/app.service";
import { authOptions } from "@/app/utils/config/authOptions";
import MenuCard from "@/app/components/MenuCard";

export default async function MenusPage() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId ?? null;
  const menus = companyId ? await AppService.getMenus(companyId) : [];

  return <MenuCard />;
}
