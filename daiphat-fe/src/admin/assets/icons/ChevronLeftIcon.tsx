import { SvgIcon, SvgIconProps } from "@mui/material";

export const ChevronLeftIcon = (props: SvgIconProps) => (
    <SvgIcon
        {...props}
        viewBox="0 0 24 24"
        sx={{
            fontSize: 24,
            ...props.sx,
        }}
    >
        <path fill="currentColor" d="M13.83 19a1 1 0 0 1-.78-.37l-4.83-6a1 1 0 0 1 0-1.27l5-6a1 1 0 0 1 1.54 1.28L10.29 12l4.32 5.36a1 1 0 0 1-.78 1.64"></path>
    </SvgIcon>
);
