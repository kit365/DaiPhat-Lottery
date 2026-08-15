"use client";

import { useEffect, useState } from "react";
import { Typography, FormControlLabel, Checkbox, Box, Stack } from "@mui/material";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminConfirmDialog";

interface OrderHandoverConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Confirmation before PENDING_PICKUP → COMPLETED.
 * Confirm stays disabled until staff acknowledges the customer inspection checklist.
 */
export const OrderHandoverConfirmDialog = ({
    open,
    onClose,
    onConfirm,
}: OrderHandoverConfirmDialogProps) => {
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        if (open) {
            setAcknowledged(false);
        }
    }, [open]);

    return (
        <AdminConfirmDialog
            open={open}
            title="Xác nhận bàn giao"
            maxWidth="sm"
            cancelLabel="Quay lại"
            confirmLabel="Xác nhận hoàn thành"
            confirmDisabled={!acknowledged}
            onClose={onClose}
            onConfirm={() => {
                if (!acknowledged) return;
                onConfirm();
                onClose();
            }}
        >
            <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Yêu cầu khách hàng kiểm tra kỹ số lượng và tình trạng vật lý của vé. Hệ thống{" "}
                    <Box component="span" sx={{ fontWeight: 800, color: "var(--palette-error-dark)" }}>
                        KHÔNG
                    </Box>{" "}
                    hỗ trợ hoàn tiền hoặc đổi vé sau khi đã hoàn tất bàn giao.
                </Typography>
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: "12px",
                        border: "1px solid var(--palette-divider)",
                        bgcolor: "var(--palette-background-neutral)",
                    }}
                >
                    <FormControlLabel
                        sx={{
                            alignItems: "flex-start",
                            m: 0,
                            gap: 0.5,
                            "& .MuiFormControlLabel-label": { pt: 0.25 },
                        }}
                        control={
                            <Checkbox
                                checked={acknowledged}
                                onChange={(e) => setAcknowledged(e.target.checked)}
                                color="warning"
                                sx={{ pt: 0 }}
                            />
                        }
                        label={
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.5 }}>
                                Tôi xác nhận khách hàng đã kiểm tra và đồng ý nhận đủ vé.
                            </Typography>
                        }
                    />
                </Box>
            </Stack>
        </AdminConfirmDialog>
    );
};
