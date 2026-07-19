import { Box } from "@mui/material";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import BoTopbar from "../components/BoTopbar";
import { authOptions } from "../utils/config/authOptions";

interface Props {
  children?: React.ReactNode;
}

export default async function BackOfficeLayout({ children }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signIn");
  }

  return (
    <Box>
      <BoTopbar />
      <Box sx={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
        <Box sx={{ bgcolor: "#FFF0D1", width: "100%", p: 2 }}>{children}</Box>
      </Box>
    </Box>
  );
}
