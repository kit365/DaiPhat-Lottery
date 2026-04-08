import { SvgIcon } from "@mui/material";

export const SortDescendingIcon = ({ sortingOrder, column, ...props }: any) => (
    <SvgIcon
        {...props}
        viewBox="0 0 24 24"
    >
        <path fill="#1C252E" d="m8.303 12.404l3.327 3.431c.213.22.527.22.74 0l6.43-6.63C19.201 8.79 18.958 8 18.43 8h-5.723z"></path>        <path fill="currentColor" d="M11.293 16H5.57c-.528 0-.771-.791-.37-1.205l2.406-2.482z" opacity="0.5"></path>
        <path fill="#1C252E" d="M11.293 8H5.57c-.528 0-.771.79-.37 1.205l2.406 2.481z" opacity="0.5"></path>
    </SvgIcon>
);
