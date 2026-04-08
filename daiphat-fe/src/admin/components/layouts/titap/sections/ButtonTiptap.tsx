import { memo } from "react";
import { ButtonBase, SxProps, Theme, Tooltip } from "@mui/material";

type ToolbarButtonProps = {
    title: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    children: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    sx?: SxProps<Theme>;
};

export const ButtonTiptap = memo(({
    title,
    onClick,
    children,
    active = false,
    disabled = false,
    sx
}: ToolbarButtonProps) => {
    return (
        <Tooltip title={title} arrow PopperProps={{
            sx: {
                zIndex: 10000
            }
        }}>
            <span>
                <ButtonBase
                    disabled={disabled}
                    onClick={onClick}
                    sx={{
                        padding: "0px 6px",
                        borderRadius: "6px",
                        width: "1.0938rem",
                        height: "1.0938rem",
                        opacity: disabled ? 0.48 : 1,
                        backgroundColor: active ? "#919eab29" : "transparent",
                        border: active ? "1px solid #919eab14" : "none",
                        '&:hover': {
                            backgroundColor: disabled ? "transparent" : "#919eab14",
                        },
                        '& svg': { width: 18, height: 18 },
                        ...sx
                    }}
                >
                    {children}
                </ButtonBase>
            </span>
        </Tooltip>
    );
});
