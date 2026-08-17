"use client";

import { ReactNode } from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Breakpoint } from "@mui/material";
import {
    ADMIN_DIALOG_ACTIONS_SX,
    ADMIN_DIALOG_CONTENT_SX,
    ADMIN_DIALOG_PAPER_SX,
    ADMIN_DIALOG_TITLE_SX,
} from "./AdminConfirmDialog";

interface AdminDialogProps {
    open: boolean;
    title: ReactNode;
    children: ReactNode;
    actions?: ReactNode;
    onClose: () => void;
    maxWidth?: Breakpoint;
    disableClose?: boolean;
}

/** Form / content modal — same chrome as AdminConfirmDialog. */
export const AdminDialog = ({
    open,
    title,
    children,
    actions,
    onClose,
    maxWidth = "sm",
    disableClose = false,
}: AdminDialogProps) => (
    <Dialog
        open={open}
        onClose={disableClose ? undefined : onClose}
        fullWidth
        maxWidth={maxWidth}
        PaperProps={{ className: "admin-theme", sx: ADMIN_DIALOG_PAPER_SX }}
    >
        <DialogTitle sx={ADMIN_DIALOG_TITLE_SX}>{title}</DialogTitle>
        <DialogContent sx={ADMIN_DIALOG_CONTENT_SX}>{children}</DialogContent>
        {actions ? <DialogActions sx={ADMIN_DIALOG_ACTIONS_SX}>{actions}</DialogActions> : null}
    </Dialog>
);
