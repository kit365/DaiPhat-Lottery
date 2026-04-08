import { SvgIcon } from "@mui/material";

export const SortAscendingIcon = ({ sortingOrder, column, ...props }: any) => (
    <SvgIcon
        {...props}
        color="#1C252E"
        viewBox="0 0 24 24"
    >
        <path fill="#1C252E" d="m8.303 11.596l3.327-3.431a.499.499 0 0 1 .74 0l6.43 6.63c.401.414.158 1.205-.37 1.205h-5.723z"></path>
        <path fill="#1C252E" d="M11.293 16H5.57c-.528 0-.771-.791-.37-1.205l2.406-2.482z" opacity="0.5"></path>
    </SvgIcon>
);
