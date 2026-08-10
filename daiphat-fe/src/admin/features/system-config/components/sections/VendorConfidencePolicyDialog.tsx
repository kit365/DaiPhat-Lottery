"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { Button } from "../../../../components/ui/Button";
import { SystemConfigResponse } from "../../types/system-config";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

interface VendorConfidencePolicyDialogProps {
    open: boolean;
    configs: SystemConfigResponse[];
    loading?: boolean;
    onClose: () => void;
    onSubmit: (values: Record<string, string>) => void;
}

export const VendorConfidencePolicyDialog = ({
    open,
    configs,
    loading,
    onClose,
    onSubmit,
}: VendorConfidencePolicyDialogProps) => {
    const confidenceConfigs = useMemo(
        () =>
            configs
                .filter((c) => c.configKey.startsWith("VENDOR_CONFIDENCE_"))
                .sort((a, b) => a.configKey.localeCompare(b.configKey)),
        [configs]
    );

    const [values, setValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) return;
        const next: Record<string, string> = {};
        confidenceConfigs.forEach((c) => {
            next[c.configKey] = c.configValue ?? "";
        });
        setValues(next);
    }, [open, confidenceConfigs]);

    const handleSubmit = () => {
        onSubmit(values);
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md">
            <DialogTitle>Cập nhật bộ cấu hình confidence</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Alert severity="info">
                        Trọng số On-time / Sell-through / Experience phải cộng đúng 1. Cap theo tier phải
                        tăng dần: NEW ≤ DEVELOPING ≤ ESTABLISHED ≤ TRUSTED. Hệ thống lưu cả nhóm trong
                        một transaction và tính lại điểm tin cậy của mọi đại lý.
                    </Alert>
                    {confidenceConfigs.map((config) => (
                        <Stack key={config.configKey} spacing={0.5}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {config.configName || config.configKey}
                            </Typography>
                            <TextField
                                value={values[config.configKey] ?? ""}
                                onChange={(e) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        [config.configKey]: e.target.value,
                                    }))
                                }
                                helperText={config.description}
                                sx={fieldSx}
                                fullWidth
                                size="small"
                            />
                        </Stack>
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={!!loading}>
                    Đóng
                </Button>
                <Button
                    loading={!!loading}
                    variant="contained"
                    onClick={handleSubmit}
                    label="Lưu bộ cấu hình"
                    loadingLabel="Đang lưu..."
                    disabled={confidenceConfigs.length === 0}
                />
            </DialogActions>
        </Dialog>
    );
};
