import { SvgIcon } from "@mui/material";

export const CompactIcon = (props: any) => (
    <SvgIcon
        {...props}
        viewBox="0 0 24 24"
        sx={{
            fontSize: 20,
            color: '#1C252E',
            marginRight: "16px"
        }}
    >
        <g fill="none" fillRule="evenodd">
            <path
                fill="currentColor"
                d="M4 15.5q-.425 0-.712-.288T3 14.5V14q0-.425.288-.712T4 13h16q.425 0 .713.288T21 14v.5q0 .425-.288.713T20 15.5zM4 11q-.425 0-.712-.288T3 10v-.5q0-.425.288-.712T4 8.5h16q.425 0 .713.288T21 9.5v.5q0 .425-.288.713T20 11zm0-4.5q-.425 0-.712-.288T3 5.5V5q0-.425.288-.712T4 4h16q.425 0 .713.288T21 5v.5q0 .425-.288.713T20 6.5zM4 20q-.425 0-.712-.288T3 19v-.5q0-.425.288-.712T4 17.5h16q.425 0 .713.288T21 18.5v.5q0 .425-.288.713T20 20z"
            />
        </g>
    </SvgIcon>
);
