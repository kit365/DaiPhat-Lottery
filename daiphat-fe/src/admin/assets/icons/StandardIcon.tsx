import { SvgIcon } from "@mui/material";

export const StandardIcon = (props: any) => (
    <SvgIcon
        {...props}
        viewBox="0 0 24 24"
        sx={{
            fontSize: 20,
            color: '#1C252E',
            marginRight: "16px"
        }}
    >
        <path fill="currentColor" d="M21 16v3a2 2 0 0 1-1.85 1.995L19 21H5a2 2 0 0 1-1.995-1.85L3 19v-3zm0-6v4H3v-4zm-2-7a2 2 0 0 1 2 2v3H3V5a2 2 0 0 1 2-2z"></path>
    </SvgIcon>
);
