"use client";

import {
    Alert,
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

const DIALOG_PAPER_SX = {
    borderRadius: '16px',
    boxShadow: 'var(--customShadows-dialog)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
};

const SECTION_CARD_SX = {
    p: 2,
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    bgcolor: '#f8fafc',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const SectionCard = ({ title, children }: { title: string; children: ReactNode }) => (
    <Box sx={SECTION_CARD_SX}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
            {title}
        </Typography>
        <Divider sx={{ mb: 1, borderColor: '#e2e8f0' }} />
        {children}
    </Box>
);

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
        <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', color: 'var(--palette-text-primary)' }}>
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
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    className: 'admin-theme',
                    sx: DIALOG_PAPER_SX,
                }}
            >
                <DialogTitle
                    sx={{
                        pb: 1.5,
                        pt: 2.5,
                        px: 3,
                        pr: 6,
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: 'var(--palette-text-primary)',
                        borderBottom: '1px solid #e2e8f0',
                    }}
                >
                    Xác nhận tạo phiếu nhập lô vé
                    <IconButton
                        aria-label="Đóng"
                        onClick={handleClose}
                        disabled={isPending}
                        sx={{
                            position: 'absolute',
                            right: 12,
                            top: 12,
                            color: 'var(--palette-text-secondary)',
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent
                    sx={{
                        px: 3,
                        pb: 2.5,
                        pt: '24px !important',
                    }}
                >
                    <Stack spacing={2}>
                        <SectionCard title="Thông tin chung">
                            <SummaryRow label="Ngày quay" value={formattedDrawDate} />
                            <SummaryRow label="Nhà cung cấp" value={supplierName || '—'} />
                            <SummaryRow label="Loại lô vé cần nhập" value={getImportModeLabel(importMode)} />
                            <SummaryRow
                                label="Tổng số lượng"
                                value={`${totalDeclareQuantity.toLocaleString('vi-VN')} vé`}
                            />
                            <SummaryRow label="Tổng giá trị" value={formatVnd(totalCostValue)} />

                            {showSharedReceipt && (
                                <Box sx={{ mt: 1.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        Biên lai (dùng chung)
                                    </Typography>
                                    {receiptUrl ? (
                                        <Box
                                            onClick={() => setPreviewUrl(receiptUrl)}
                                            sx={{
                                                mt: 0.75,
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                maxWidth: 200,
                                                bgcolor: '#fff',
                                                transition: 'box-shadow 0.2s ease',
                                                '&:hover': {
                                                    boxShadow: 'var(--customShadows-z8)',
                                                },
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
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Không có ảnh biên lai.
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </SectionCard>

                        {lines.map((line, index) => {
                            const lineTotal = line.declareQuantity * line.importCost;

                            return (
                                <SectionCard
                                    key={`${line.stationName}-${index}`}
                                    title={`Dòng ${index + 1}: ${line.stationName || '—'}`}
                                >
                                    <SummaryRow label="Loại lô" value={getBatchTypeLabel(line.batchType)} />
                                    <SummaryRow
                                        label="Số lượng"
                                        value={`${line.declareQuantity.toLocaleString('vi-VN')} vé`}
                                    />
                                    <SummaryRow label="Giá vốn" value={formatVnd(line.importCost)} />
                                    <SummaryRow label="Tổng dòng" value={formatVnd(lineTotal)} />
                                </SectionCard>
                            );
                        })}

                        <Alert
                            severity="warning"
                            sx={{
                                borderRadius: '12px',
                                alignItems: 'flex-start',
                                border: '1px solid rgba(255, 171, 0, 0.24)',
                                bgcolor: 'rgba(255, 171, 0, 0.08)',
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Sau khi xác nhận, phiếu nhập sẽ được tạo và không thể hoàn tác.
                            </Typography>
                        </Alert>
                    </Stack>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        pb: 2.5,
                        pt: 2,
                        gap: 1,
                        borderTop: '1px solid #e2e8f0',
                        bgcolor: '#f8fafc',
                    }}
                >
                    <Button
                        onClick={handleClose}
                        disabled={isPending}
                        variant="outlined"
                        className="btn-outlined-admin"
                        sx={{ minWidth: 96 }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={onConfirm}
                        variant="contained"
                        className="btn-primary-admin"
                        loading={isPending}
                        disabled={isPending}
                        label="Xác nhận & Lưu"
                        loadingLabel="Đang xử lý..."
                        sx={{
                            minWidth: 140,
                            backgroundColor: '#1C252E !important',
                            color: '#FFFFFF !important',
                            '&:hover': {
                                backgroundColor: '#454F5B !important',
                            },
                        }}
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
