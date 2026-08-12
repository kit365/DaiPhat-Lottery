"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
    Card,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
} from "@mui/material";
import { Button } from "../../../../components/ui/Button";
import { SystemConfigResponse } from "../../types/system-config";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
        bgcolor: 'var(--palette-background-paper)',
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
        () => configs.filter((c) => c.configKey.startsWith("VENDOR_CONFIDENCE_")),
        [configs]
    );

    const [values, setValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) return;
        const next: Record<string, string> = {};
        confidenceConfigs.forEach((c) => {
            let val = c.configValue ?? "";
            if (val && (c.configKey.endsWith('_CAP_PERCENT') || c.configKey.endsWith('_WEIGHT'))) {
                const num = Number(val);
                if (Number.isFinite(num)) {
                    val = (num * 100).toString();
                }
            }
            next[c.configKey] = val;
        });
        setValues(next);
    }, [open, confidenceConfigs]);

    const handleSubmit = () => {
        const payload: Record<string, string> = {};
        Object.entries(values).forEach(([k, v]) => {
            let finalVal = v;
            if (v && (k.endsWith('_CAP_PERCENT') || k.endsWith('_WEIGHT'))) {
                const num = Number(v);
                if (Number.isFinite(num)) {
                    finalVal = (num / 100).toString();
                }
            }
            payload[k] = finalVal;
        });
        onSubmit(payload);
    };

    const renderInput = (configKey: string, placeholder?: string) => {
        const config = confidenceConfigs.find(c => c.configKey === configKey);
        if (!config) return "—";

        return (
            <TextField
                value={values[config.configKey] ?? ""}
                onChange={(e) =>
                    setValues((prev) => ({
                        ...prev,
                        [config.configKey]: e.target.value,
                    }))
                }
                sx={fieldSx}
                fullWidth
                size="small"
                placeholder={placeholder}
                InputProps={{
                    endAdornment: (config.configKey.endsWith('_CAP_PERCENT') || config.configKey.endsWith('_WEIGHT')) ? (
                        <Typography variant="body2" color="text.secondary">%</Typography>
                    ) : undefined
                }}
                inputProps={{ 'aria-label': config.configName || configKey }}
            />
        );
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="lg">
            <DialogTitle>Điều chỉnh chính sách điểm tin cậy</DialogTitle>
            <DialogContent sx={{ py: 2 }}>
                <Stack spacing={4}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
                            Hạn mức theo mức độ tin cậy
                        </Typography>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                        <TableRow>
                                            <TableCell width="28%">Tiêu chí</TableCell>
                                            <TableCell width="18%" align="center">Mới</TableCell>
                                            <TableCell width="18%" align="center">Đang phát triển</TableCell>
                                            <TableCell width="18%" align="center">Ổn định</TableCell>
                                            <TableCell width="18%" align="center">Tin cậy</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 500 }}>Điểm uy tín tối thiểu</TableCell>
                                            <TableCell align="center">—</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_DEVELOPING_MIN_SCORE')}</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_ESTABLISHED_MIN_SCORE')}</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_TRUSTED_MIN_SCORE')}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 500 }}>Số phiếu đã quyết toán tối thiểu</TableCell>
                                            <TableCell align="center">—</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_DEVELOPING_MIN_BATCHES')}</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_ESTABLISHED_MIN_BATCHES')}</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_TRUSTED_MIN_BATCHES')}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 500 }}>Hạn mức được giao</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_NEW_CAP_PERCENT')}</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_DEVELOPING_CAP_PERCENT')}</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_ESTABLISHED_CAP_PERCENT')}</TableCell>
                                            <TableCell>{renderInput('VENDOR_CONFIDENCE_TRUSTED_CAP_PERCENT')}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            Để lên mức tiếp theo, người bán vé số phải đạt đồng thời số phiếu tối thiểu và điểm uy tín tối thiểu. Hạn mức theo mức độ tin cậy phải tăng dần từ Mới đến Tin cậy.
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
                            Cách tính điểm uy tín
                        </Typography>
                        <Card variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                                <Stack flex={1} spacing={2}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Typography variant="body2" sx={{ width: 140, fontWeight: 500 }}>Trả vé đúng hạn:</Typography>
                                        <Box flex={1}>{renderInput('VENDOR_CONFIDENCE_ON_TIME_WEIGHT')}</Box>
                                    </Stack>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Typography variant="body2" sx={{ width: 140, fontWeight: 500 }}>Tỉ lệ bán vé:</Typography>
                                        <Box flex={1}>{renderInput('VENDOR_CONFIDENCE_SELL_THROUGH_WEIGHT')}</Box>
                                    </Stack>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Typography variant="body2" sx={{ width: 140, fontWeight: 500 }}>Kinh nghiệm:</Typography>
                                        <Box flex={1}>{renderInput('VENDOR_CONFIDENCE_EXPERIENCE_WEIGHT')}</Box>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                        Tổng trọng số 3 tiêu chí này phải cộng đúng 100% (1.0).
                                    </Typography>
                                </Stack>

                                <Box sx={{ width: '1px', bgcolor: 'divider', display: { xs: 'none', md: 'block' } }} />

                                <Stack flex={1} spacing={2} justifyContent="center">
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Typography variant="body2" sx={{ width: 140, fontWeight: 500 }}>Số phiếu gần nhất dùng để đánh giá:</Typography>
                                        <Box flex={1}>{renderInput('VENDOR_CONFIDENCE_EXPERIENCE_WINDOW')}</Box>
                                    </Stack>
                                </Stack>
                            </Stack>
                        </Card>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ pt: 2, px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={!!loading} variant="outlined" color="inherit">
                    Đóng
                </Button>
                <Button
                    loading={!!loading}
                    variant="contained"
                    onClick={handleSubmit}
                    label="Lưu cấu hình"
                    loadingLabel="Đang lưu..."
                    disabled={confidenceConfigs.length === 0}
                />
            </DialogActions>
        </Dialog>
    );
};
