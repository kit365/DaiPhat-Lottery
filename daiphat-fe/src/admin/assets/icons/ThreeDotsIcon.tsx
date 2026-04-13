import { SvgIcon } from "@mui/material";

export const ThreeDotsIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24" sx={{ width: "20px", height: "20px" }}>
        <circle cx="12" cy="12" r="2" fill="#637381"></circle>
        <circle cx="12" cy="5" r="2" fill="#637381"></circle>
        <circle cx="12" cy="19" r="2" fill="#637381"></circle>
    </SvgIcon>
);
