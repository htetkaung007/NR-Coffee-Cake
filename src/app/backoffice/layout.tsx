import { Box, Typography } from "@mui/material";
import BoTopbar from "../components/BoTopbar";

interface Props {
  children?: React.ReactNode;
}

const BackOfficeLayout = ({ children }: Props) => {
  return (
    <Box>
      <Typography variant="h6">BackOfficeLayout</Typography>
      <BoTopbar />
      <Box sx={{ display: "flex", height: "100vh" }}>
        {/* {<BoSidebar />} */}
        <Box sx={{ bgcolor: "#FFF0D1", width: "100%", p: 2 }}>{children}</Box>
      </Box>
    </Box>
  );
};
export default BackOfficeLayout;
