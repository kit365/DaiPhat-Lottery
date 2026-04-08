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
            bgcolor: '#1C252E',
            color: '#FFFFFF',
            '&:hover': {
                bgcolor: "#454F5B",
                boxShadow: "0 8px 16px 0 rgba(145, 158, 171, 0.16)",
            },
        }),
        '&.Mui-disabled': {
            bgcolor: 'rgba(145, 158, 171, 0.24)',
            color: 'rgba(145, 158, 171, 0.8)',
        },
        ...sx
    };

    return (
        <Button
            variant={variant}
            disabled={loading || props.disabled}
            sx={defaultSx}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : startIcon}
            {...props}
        >
            {loading ? (loadingLabel || "Đang xử lý...") : label}
        </Button>
    );
};
