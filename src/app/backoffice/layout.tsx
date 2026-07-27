import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../utils/config/authOptions";
import { BackofficeShell } from "../components/BackofficeShell";
import { AppService } from "../services/app.service";

interface Props {
  children?: React.ReactNode;
}

export default async function BackOfficeLayout({ children }: Props) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/auth/signIn");

  const company = await AppService.getCompanyByEmail(email);
  if (!company) redirect("/auth/signIn");
  const companyName = company.name;

  return (
    <div>
      <BackofficeShell companyName={companyName}>
        <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
          <div
            style={{
              backgroundColor: "#FFF0D1",
              width: "100%",
              padding: "16px",
            }}
          >
            {children}
          </div>
        </div>
      </BackofficeShell>
    </div>
  );
}
