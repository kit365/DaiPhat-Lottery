import { Button as MuiButton, ButtonProps, SxProps, Theme } from "@mui/material";
import { motion } from "framer-motion";
import { ReactNode } from "react";

export interface AdminButtonProps extends ButtonProps {
    loading?: boolean;
    label?: string;
    loadingLabel?: string;
    children?: ReactNode;
    [key: string]: any;
}

const MiniSpinner = () => (
    <div className="relative flex items-center justify-center mr-2">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "2.5px solid currentColor",
                borderTopColor: "transparent",
                opacity: 0.8,
            }}
        />
    </div>
);

function resolveAdminClass(variant?: ButtonProps["variant"], color?: ButtonProps["color"]) {
    if (variant === "contained" && (!color || color === "primary")) {
        return "btn-primary-admin";
    }

    if (variant === "outlined" && (!color || color === "primary" || color === "inherit")) {
        return "btn-outlined-admin";
    }

    return undefined;
}

function resolveVariant(
    variant: ButtonProps["variant"] | undefined,
    label?: string,
    children?: ReactNode,
) {
    if (variant) {
        return variant;
    }

    if (label != null && children == null) {
        return "contained";
    }

    return "text";
}

export const Button = ({
    loading,
    label,
    loadingLabel,
    children,
    startIcon,
    sx,
    className,
    variant,
    color = "primary",
    disabled,
    ...props
}: AdminButtonProps) => {
    const resolvedVariant = resolveVariant(variant, label, children);
    const adminClass = resolveAdminClass(resolvedVariant, color);
    const content = loading ? loadingLabel || "Đang xử lý..." : label ?? children;

    const defaultSx: SxProps<Theme> = {
        fontWeight: 700,
        fontSize: "0.875rem",
        padding: resolvedVariant === "text" ? undefined : "8px 24px",
        borderRadius: "8px",
        textTransform: "none",
        boxShadow: "none",
        ...sx,
    };

    const mergedClassName = [adminClass, className].filter(Boolean).join(" ") || undefined;

    return (
        <MuiButton
            {...props}
            variant={resolvedVariant}
            color={color}
            disabled={loading || disabled}
            className={mergedClassName}
            sx={defaultSx}
            startIcon={loading ? <MiniSpinner /> : startIcon}
        >
            {content}
        </MuiButton>
    );
};
