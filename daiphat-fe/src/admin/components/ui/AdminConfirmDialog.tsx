"use client";

import { ReactNode } from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Breakpoint } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { Button } from "./Button";

interface AdminConfirmDialogProps {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
    onConfirm: () => void;
    cancelLabel?: string;
    confirmLabel: string;
    confirmLoadingLabel?: string;
    loading?: boolean;
    confirmDisabled?: boolean;
    confirmColor?: "primary" | "error";
    maxWidth?: Breakpoint;
}

export const ADMIN_DIALOG_PAPER_SX: SxProps<Theme> = {
    borderRadius: "16px",
    boxShadow: "var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))",
    bgcolor: "#FFFFFF",
    overflow: "hidden",
};

export const ADMIN_DIALOG_TITLE_SX: SxProps<Theme> = {
    m: 0,
    px: 3,
    pt: 2.5,
    pb: 2,
    fontWeight: 700,
    fontSize: "1.125rem",
    borderBottom: "1px solid var(--palette-divider)",
    bgcolor: "#FFFFFF",
};

export const ADMIN_DIALOG_CONTENT_SX: SxProps<Theme> = {
    px: 3,
    pt: "24px !important",
    pb: 1,
    bgcolor: "#FFFFFF",
};

export const ADMIN_DIALOG_ACTIONS_SX: SxProps<Theme> = {
    px: 3,
    py: 2.5,
    gap: 1.5,
    borderTop: "1px solid var(--palette-divider)",
    bgcolor: "#FFFFFF",
};

export const AdminConfirmDialog = ({
    open,
    title,
    children,
    onClose,
    onConfirm,
    cancelLabel = "Quay lại",
    confirmLabel,
    confirmLoadingLabel,
    loading = false,
    confirmDisabled = false,
    confirmColor = "primary",
    maxWidth = "xs",
}: AdminConfirmDialogProps) => (
    <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        fullWidth
        maxWidth={maxWidth}
        PaperProps={{ className: "admin-theme", sx: ADMIN_DIALOG_PAPER_SX }}
    >
        <DialogTitle sx={ADMIN_DIALOG_TITLE_SX}>{title}</DialogTitle>
        <DialogContent sx={ADMIN_DIALOG_CONTENT_SX}>{children}</DialogContent>
        <DialogActions sx={ADMIN_DIALOG_ACTIONS_SX}>
            <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading} label={cancelLabel} />
            <Button
                variant="contained"
                color={confirmColor}
                onClick={onConfirm}
                loading={loading}
                disabled={confirmDisabled}
                label={confirmLabel}
                loadingLabel={confirmLoadingLabel}
            />
        </DialogActions>
    </Dialog>
);
