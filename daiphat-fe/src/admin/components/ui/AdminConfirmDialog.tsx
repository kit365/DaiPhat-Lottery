"use client";

import { ReactNode } from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Breakpoint } from "@mui/material";
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
    maxWidth?: Breakpoint;
}

const paperSx = {
    borderRadius: "16px",
    boxShadow: "var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))",
    bgcolor: "#FFFFFF",
    overflow: "hidden",
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
    maxWidth = "xs",
}: AdminConfirmDialogProps) => (
    <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        fullWidth
        maxWidth={maxWidth}
        PaperProps={{ className: "admin-theme", sx: paperSx }}
    >
        <DialogTitle
            sx={{
                m: 0,
                px: 3,
                pt: 2.5,
                pb: 2,
                fontWeight: 700,
                fontSize: "1.125rem",
                borderBottom: "1px solid var(--palette-divider)",
                bgcolor: "#FFFFFF",
            }}
        >
            {title}
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: "24px !important", pb: 1, bgcolor: "#FFFFFF" }}>
            {children}
        </DialogContent>
        <DialogActions
            sx={{
                px: 3,
                py: 2.5,
                gap: 1.5,
                borderTop: "1px solid var(--palette-divider)",
                bgcolor: "#FFFFFF",
            }}
        >
            <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading} label={cancelLabel} />
            <Button
                variant="contained"
                onClick={onConfirm}
                loading={loading}
                disabled={confirmDisabled}
                label={confirmLabel}
                loadingLabel={confirmLoadingLabel}
            />
        </DialogActions>
    </Dialog>
);
