import { Button, ButtonProps, SxProps, Theme } from "@mui/material";
import { motion } from "framer-motion";

interface LoadingButtonProps extends ButtonProps {
    loading?: boolean;
    label: string;
    loadingLabel?: string;
    [key: string]: any;
}

const MiniSpinner = () => (
    <div className="relative flex items-center justify-center mr-2">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
           style={{
               width: 18, height: 18, borderRadius: '50%',
               border: '2.5px solid currentColor',
               borderTopColor: 'transparent',
               opacity: 0.8
           }}
        />
    </div>
);

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
            startIcon={loading ? <MiniSpinner /> : startIcon}
            {...props}
        >
            {loading ? loadingLabel || "Đang xử lý..." : label}
        </Button>
    );
};
