import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../utils/config/authOptions";
import { BackofficeShell } from "../components/BackofficeShell";
import { AppService } from "../services";
import { Box } from "@mui/material";

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
    <Box>
      <BackofficeShell companyName={companyName}>
        <Box sx={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
          <Box
            sx={{
              bgcolor: "background.paper",
              width: "100%",
              padding: { xs: 0, sm: 0, md: 3 },
              borderRadius: 3,
            }}
          >
            {children}
          </Box>
        </Box>
      </BackofficeShell>
    </Box>
  );
}
