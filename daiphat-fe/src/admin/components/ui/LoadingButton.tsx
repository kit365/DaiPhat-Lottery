import { Button, CircularProgress, ButtonProps, SxProps, Theme } from "@mui/material";

interface LoadingButtonProps extends ButtonProps {
    loading?: boolean;
    label: string;
    loadingLabel?: string;
    [key: string]: any;
}

export const LoadingButton = ({
    loading,
    label,
    loadingLabel,
    startIcon,
    sx,
    className,
    variant = "contained",
    ...props
}: LoadingButtonProps) => {
    const defaultSx: SxProps<Theme> = {
        fontWeight: 700,
        fontSize: "0.875rem",
        padding: "8px 24px",
        borderRadius: "8px",
        textTransform: "none",
        boxShadow: "none",
        ...(variant === "contained" && {
            bgcolor: "var(--palette-text-primary)",
            color: "var(--palette-common-white)",
            "&:hover": {
                bgcolor: "var(--palette-grey-700)",
                boxShadow: "var(--customShadows-z8)",
            },
        }),
        "&.Mui-disabled": {
            bgcolor: "rgba(145, 158, 171, 0.24)",
            color: "rgba(145, 158, 171, 0.8)",
        },
        ...sx,
    };

    const mergedClassName =
        variant === "contained"
            ? ["btn-primary-admin", className].filter(Boolean).join(" ")
            : className;

    return (
        <Button
            variant={variant}
            disabled={loading || props.disabled}
            className={mergedClassName}
            sx={defaultSx}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : startIcon}
            {...props}
        >
            {loading ? loadingLabel || "Đang xử lý..." : label}
        </Button>
    );
};
