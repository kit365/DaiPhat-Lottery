import { SvgIcon } from "@mui/material";

export const ComfortableIcon = (props: any) => (
    <SvgIcon
        {...props}
        viewBox="0 0 24 24"
        sx={{
            fontSize: 20,
            color: '#1C252E',
            marginRight: "16px"
        }}
    >
        <path
            fill="currentColor"
            d="M5 3a2 2 0 0 0-2 2v6h18V5a2 2 0 0 0-2-2zm16 10H3v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"
        />
    </SvgIcon>
);
