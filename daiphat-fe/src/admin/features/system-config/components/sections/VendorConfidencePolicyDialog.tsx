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
    Tooltip,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Button } from "../../../../components/ui/Button";
import {
    ADMIN_DIALOG_ACTIONS_SX,
    ADMIN_DIALOG_CONTENT_SX,
    ADMIN_DIALOG_PAPER_SX,
    ADMIN_DIALOG_TITLE_SX,
} from "../../../../components/ui/AdminConfirmDialog";
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
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth="lg"
            PaperProps={{ className: "admin-theme", sx: ADMIN_DIALOG_PAPER_SX }}
        >
            <DialogTitle sx={ADMIN_DIALOG_TITLE_SX}>Điều chỉnh chính sách điểm tin cậy</DialogTitle>
            <DialogContent sx={ADMIN_DIALOG_CONTENT_SX}>
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
                        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                Cách tính điểm uy tín
                            </Typography>
                            <Tooltip
                                title="Điểm uy tín được tính theo thang điểm 100 dựa trên lịch sử hoạt động trong N phiếu gần nhất của người bán."
                                arrow
                                placement="top"
                            >
                                <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary', cursor: 'pointer' }} />
                            </Tooltip>
                        </Stack>
                        <Card variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                                <Stack flex={1.2} spacing={2.5}>
                                    {/* Trả vé đúng hạn */}
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Box sx={{ width: 170 }}>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Trả vé đúng hạn:
                                                </Typography>
                                                <Tooltip
                                                    title="Tỉ lệ số phiếu được quyết toán/trả vé đúng hạn trên tổng số phiếu trong kỳ đánh giá."
                                                    arrow
                                                    placement="top"
                                                >
                                                    <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary', cursor: 'pointer' }} />
                                                </Tooltip>
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.2 }}>
                                                (Số phiếu đúng hạn ÷ Số phiếu đánh giá)
                                            </Typography>
                                        </Box>
                                        <Box flex={1}>{renderInput('VENDOR_CONFIDENCE_ON_TIME_WEIGHT')}</Box>
                                    </Stack>

                                    {/* Tỉ lệ bán vé */}
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Box sx={{ width: 170 }}>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Tỉ lệ bán vé:
                                                </Typography>
                                                <Tooltip
                                                    title="Tỉ lệ tổng số vé bán được thành công so với tổng số vé được giao nhận trong kỳ đánh giá."
                                                    arrow
                                                    placement="top"
                                                >
                                                    <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary', cursor: 'pointer' }} />
                                                </Tooltip>
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.2 }}>
                                                (Tổng vé đã bán ÷ Tổng vé được giao)
                                            </Typography>
                                        </Box>
                                        <Box flex={1}>{renderInput('VENDOR_CONFIDENCE_SELL_THROUGH_WEIGHT')}</Box>
                                    </Stack>

                                    {/* Kinh nghiệm */}
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Box sx={{ width: 170 }}>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Kinh nghiệm:
                                                </Typography>
                                                <Tooltip
                                                    title="Mức độ tích lũy số phiếu đã bán (đạt tối đa 100% khi người bán hoàn tất đủ N phiếu của cửa sổ đánh giá)."
                                                    arrow
                                                    placement="top"
                                                >
                                                    <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary', cursor: 'pointer' }} />
                                                </Tooltip>
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.2 }}>
                                                (Số phiếu hoàn tất ÷ Cửa sổ N phiếu)
                                            </Typography>
                                        </Box>
                                        <Box flex={1}>{renderInput('VENDOR_CONFIDENCE_EXPERIENCE_WEIGHT')}</Box>
                                    </Stack>

                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pt: 0.5 }}>
                                        * Tổng trọng số của 3 tiêu chí này phải cộng đúng bằng 100% (1.0).
                                    </Typography>
                                </Stack>

                                <Box sx={{ width: '1px', bgcolor: 'divider', display: { xs: 'none', md: 'block' } }} />

                                <Stack flex={0.9} spacing={2} justifyContent="flex-start">
                                    <Box>
                                        <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                Cửa sổ đánh giá:
                                            </Typography>
                                            <Tooltip
                                                title="Hệ thống chỉ lấy tối đa N phiếu quyết toán gần nhất của người bán để tổng hợp và tính điểm uy tín."
                                                arrow
                                                placement="top"
                                            >
                                                <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary', cursor: 'pointer' }} />
                                            </Tooltip>
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.3 }}>
                                            Số lượng phiếu hoàn tất gần nhất dùng làm mẫu dữ liệu đánh giá 3 tiêu chí trên.
                                        </Typography>
                                        <Box sx={{ maxWidth: { xs: '100%', md: 220 } }}>
                                            {renderInput('VENDOR_CONFIDENCE_EXPERIENCE_WINDOW', 'Ví dụ: 30')}
                                        </Box>
                                    </Box>

                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 1.5,
                                            bgcolor: 'var(--palette-background-neutral, rgba(0,0,0,0.03))',
                                            border: '1px solid var(--palette-divider, #e2e8f0)',
                                            mt: 'auto !important'
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.5 }}>
                                            Công thức tổng quát:
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.4 }}>
                                            Điểm uy tín = (Đúng hạn × W₁ + Tỉ lệ bán × W₂ + Kinh nghiệm × W₃) × 100
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Stack>
                        </Card>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={ADMIN_DIALOG_ACTIONS_SX}>
                <Button onClick={onClose} disabled={!!loading} variant="outlined" color="inherit" label="Đóng" />
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
