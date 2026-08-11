"use client";

import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from '../../../../../components/ui/Button';
import { getBatchTypeLabel, getImportModeLabel } from '../../utils/batchTypeLabels';
import type { ImportBatchImportMode } from '../../utils/batchTypeLabels';
import type { InvoiceEvidenceValue } from '../../utils/invoiceEvidence';
import { formatVnd } from '../../utils/importCostCalculator';

export interface ConfirmLineSummary {
    stationName: string;
    batchType: string;
    declareQuantity: number;
    importCost: number;
}

interface ImportBatchConfirmDialogProps {
    open: boolean;
    drawDate: string;
    supplierName?: string;
    importMode?: ImportBatchImportMode;
    invoiceEvidenceUrl?: InvoiceEvidenceValue;
    lines: ConfirmLineSummary[];
    totalDeclareQuantity: number;
    totalCostValue: number;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(140px, 1fr) minmax(0, 1.4fr)',
            gap: 1.5,
            py: 0.75,
        }}
    >
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
            {value}
        </Typography>
    </Box>
);

export const ImportBatchConfirmDialog = ({
    open,
    drawDate,
    supplierName,
    importMode,
    invoiceEvidenceUrl,
    lines,
    totalDeclareQuantity,
    totalCostValue,
    isPending,
    onClose,
    onConfirm,
}: ImportBatchConfirmDialogProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const formattedDrawDate = drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—';
    const receiptUrl = useMemo(() => {
        if (invoiceEvidenceUrl instanceof File) {
            return URL.createObjectURL(invoiceEvidenceUrl);
        }
        return typeof invoiceEvidenceUrl === 'string' ? invoiceEvidenceUrl.trim() : '';
    }, [invoiceEvidenceUrl]);

    useEffect(() => {
        if (!(invoiceEvidenceUrl instanceof File) || !receiptUrl) {
            return;
        }
        return () => URL.revokeObjectURL(receiptUrl);
    }, [invoiceEvidenceUrl, receiptUrl]);

    const showSharedReceipt = importMode === 'IN_DAY';

    const handleClose = () => {
        if (!isPending) {
            setPreviewUrl(null);
            onClose();
        }
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle sx={{ pb: 1, pr: 6 }}>
                    Xác nhận tạo phiếu nhập lô vé
                    <IconButton
                        aria-label="Đóng"
                        onClick={handleClose}
                        disabled={isPending}
                        sx={{ position: 'absolute', right: 12, top: 12 }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 1 }}>
                    <Stack spacing={2.5}>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'var(--palette-background-neutral)',
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                Thông tin chung
                            </Typography>
                            <Divider sx={{ mb: 1 }} />
                            <SummaryRow label="Ngày quay" value={formattedDrawDate} />
                            <SummaryRow label="Nhà cung cấp" value={supplierName || '—'} />
                            <SummaryRow
                                label="Loại lô vé cần nhập"
                                value={getImportModeLabel(importMode)}
                            />
                            <SummaryRow
                                label="Tổng số lượng"
                                value={`${totalDeclareQuantity.toLocaleString('vi-VN')} vé`}
                            />
                            <SummaryRow label="Tổng giá trị lô vé nhập" value={formatVnd(totalCostValue)} />

                            {showSharedReceipt && (
                                <Box sx={{ mt: 1.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Biên lai (dùng chung)
                                    </Typography>
                                    {receiptUrl ? (
                                        <Box
                                            onClick={() => setPreviewUrl(receiptUrl)}
                                            sx={{
                                                mt: 0.5,
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                maxWidth: 200,
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={receiptUrl}
                                                alt="Biên lai"
                                                sx={{
                                                    display: 'block',
                                                    width: '100%',
                                                    maxHeight: 120,
                                                    objectFit: 'contain',
                                                }}
                                            />
                                        </Box>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            Không có ảnh biên lai.
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Box>

                        {lines.map((line, index) => {
                            const lineTotal = line.declareQuantity * line.importCost;

                            return (
                                <Box
                                    key={`${line.stationName}-${index}`}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                        Dòng {index + 1}: {line.stationName || '—'}
                                    </Typography>
                                    <Divider sx={{ mb: 1 }} />
                                    <SummaryRow
                                        label="Loại lô"
                                        value={getBatchTypeLabel(line.batchType)}
                                    />
                                    <SummaryRow
                                        label="Số lượng"
                                        value={`${line.declareQuantity.toLocaleString('vi-VN')} vé`}
                                    />
                                    <SummaryRow label="Giá vốn" value={formatVnd(line.importCost)} />
                                    <SummaryRow label="Tổng dòng" value={formatVnd(lineTotal)} />
                                </Box>
                            );
                        })}

                        <Alert severity="warning" sx={{ borderRadius: 2, alignItems: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Sau khi xác nhận, phiếu nhập sẽ được tạo và không thể hoàn tác.
                            </Typography>
                            <Typography variant="body2">
                                Vui lòng kiểm tra kỹ thông tin trước khi tiếp tục.
                            </Typography>
                        </Alert>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                    <Button
                        onClick={handleClose}
                        disabled={isPending}
                        color="inherit"
                        variant="outlined"
                        sx={{
                            borderColor: 'divider',
                            '&:hover': { borderColor: 'text.primary', bgcolor: 'transparent' },
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={onConfirm}
                        variant="contained"
                        color="primary"
                        className="btn-primary-admin"
                        loading={isPending}
                        disabled={isPending}
                        label="Xác nhận & Lưu"
                        loadingLabel="Đang xử lý..."
                    />
                </DialogActions>
            </Dialog>

            <Dialog
                open={!!previewUrl}
                onClose={() => setPreviewUrl(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.92)', boxShadow: 'none' } }}
            >
                <IconButton
                    aria-label="Đóng xem ảnh"
                    onClick={() => setPreviewUrl(null)}
                    sx={{ position: 'absolute', right: 8, top: 8, color: '#fff', zIndex: 1 }}
                >
                    <CloseIcon />
                </IconButton>
                <DialogContent
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 3,
                        minHeight: 320,
                    }}
                >
                    {previewUrl && (
                        <Box
                            component="img"
                            src={previewUrl}
                            alt="Ảnh biên lai"
                            sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
