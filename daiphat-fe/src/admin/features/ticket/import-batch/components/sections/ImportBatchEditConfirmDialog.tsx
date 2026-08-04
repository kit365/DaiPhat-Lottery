"use client";

import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import type {
    ImportBatchEditChangeSummary,
    ImportBatchEditFieldChange,
    ImportBatchEditInvoiceChange,
} from '../../utils/importBatchEditChanges';
import { formatImportCost } from '../../utils/importCostCalculator';

interface ImportBatchEditConfirmDialogProps {
    open: boolean;
    summary: ImportBatchEditChangeSummary | null;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ChangeRow = ({ label, oldValue, newValue }: ImportBatchEditFieldChange) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(140px, 1fr) minmax(0, 1.6fr)',
            gap: 1.5,
            py: 0.75,
            alignItems: 'center',
        }}
    >
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'right', lineHeight: 1.5 }}>
            <Box
                component="span"
                sx={{
                    color: 'text.secondary',
                    textDecoration: 'line-through',
                    mr: 0.75,
                }}
            >
                {oldValue}
            </Box>
            <Box component="span" sx={{ color: 'text.disabled', mx: 0.25 }}>
                →
            </Box>
            <Box
                component="span"
                sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    ml: 0.75,
                }}
            >
                {newValue}
            </Box>
        </Typography>
    </Box>
);

const SectionCard = ({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) => (
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
            {title}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {children}
    </Box>
);

const formatVnd = (value: number) => `${formatImportCost(value)} VNĐ`;

const InvoiceThumbnail = ({
    label,
    url,
    emptyLabel,
}: {
    label: string;
    url: string | File;
    emptyLabel: string;
}) => {
    const [objectUrl, setObjectUrl] = useState('');

    useEffect(() => {
        if (url instanceof File) {
            const next = URL.createObjectURL(url);
            setObjectUrl(next);
            return () => URL.revokeObjectURL(next);
        }
        setObjectUrl(typeof url === 'string' ? url : '');
        return undefined;
    }, [url]);

    const src = url instanceof File ? objectUrl : typeof url === 'string' ? url : '';
    const canOpen = typeof url === 'string' && !!url;

    return (
        <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}
            >
                {label}
            </Typography>
            {src ? (
                <Box
                    component={canOpen ? 'a' : 'div'}
                    href={canOpen ? src : undefined}
                    target={canOpen ? '_blank' : undefined}
                    rel={canOpen ? 'noopener noreferrer' : undefined}
                    aria-label={canOpen ? `${label} — mở ảnh gốc trong tab mới` : label}
                    sx={{
                        display: 'block',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden',
                        cursor: canOpen ? 'pointer' : 'default',
                        bgcolor: 'background.paper',
                        transition: 'border-color 0.2s',
                        '&:hover': canOpen ? { borderColor: 'text.primary' } : undefined,
                    }}
                >
                    <Box
                        component="img"
                        src={src}
                        alt={label}
                        sx={{
                            display: 'block',
                            width: '100%',
                            maxHeight: 160,
                            objectFit: 'contain',
                        }}
                    />
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 120,
                        p: 2,
                        borderRadius: 1,
                        border: '1px dashed',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        {emptyLabel}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

const InvoiceComparison = ({ invoiceChange }: { invoiceChange: ImportBatchEditInvoiceChange }) => (
    <Box sx={{ py: 0.75 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
            Ảnh biên lai
        </Typography>
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' },
                gap: { xs: 1.5, sm: 2 },
                alignItems: 'center',
            }}
        >
            <InvoiceThumbnail
                label="Biên lai gốc"
                url={invoiceChange.oldUrl}
                emptyLabel="Chưa có ảnh"
            />
            <Typography
                variant="body2"
                color="text.disabled"
                sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'center' }}
            >
                →
            </Typography>
            <InvoiceThumbnail
                label="Biên lai mới"
                url={invoiceChange.newUrl}
                emptyLabel="Đã xóa"
            />
        </Box>
    </Box>
);

export const ImportBatchEditConfirmDialog = ({
    open,
    summary,
    isPending,
    onClose,
    onConfirm,
}: ImportBatchEditConfirmDialogProps) => {
    const handleClose = () => {
        if (!isPending) {
            onClose();
        }
    };

    if (!summary) {
        return null;
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pb: 1, pr: 6 }}>
                Xác nhận thay đổi phiếu nhập lô
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
                    <Typography variant="body2" color="text.secondary">
                        Vui lòng kiểm tra các thay đổi dưới đây trước khi lưu. Chỉ các trường đã
                        thay đổi được hiển thị.
                    </Typography>

                    {(summary.headerChanges.length > 0 || summary.invoiceChange) && (
                        <SectionCard title="Thông tin phiếu nhập lô">
                            {summary.headerChanges.map((change) => (
                                <ChangeRow key={change.label} {...change} />
                            ))}
                            {summary.invoiceChange && (
                                <InvoiceComparison invoiceChange={summary.invoiceChange} />
                            )}
                        </SectionCard>
                    )}

                    {summary.modifiedLines.map((line) => (
                        <SectionCard key={line.lineLabel} title={line.lineLabel}>
                            {line.changes.map((change) => (
                                <ChangeRow key={`${line.lineLabel}-${change.label}`} {...change} />
                            ))}
                        </SectionCard>
                    ))}

                    {summary.addedLines.length > 0 && (
                        <SectionCard title="Dòng nhập lô được thêm">
                            {summary.addedLines.map((line) => (
                                <Box key={line.lineLabel} sx={{ py: 0.75 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        {line.lineLabel}: {line.stationName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Số lượng khai báo:{' '}
                                        <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                            {line.declareQuantity.toLocaleString('vi-VN')} vé
                                        </Box>
                                        {' · '}
                                        Giá vốn:{' '}
                                        <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                            {formatVnd(line.importCost)}
                                        </Box>
                                    </Typography>
                                </Box>
                            ))}
                        </SectionCard>
                    )}

                    {summary.removedLines.length > 0 && (
                        <SectionCard title="Dòng nhập lô bị xóa">
                            {summary.removedLines.map((line) => (
                                <Box key={line.lineLabel} sx={{ py: 0.75 }}>
                                    <Typography variant="body2">
                                        <Box component="span" sx={{ fontWeight: 600 }}>
                                            {line.lineLabel}:
                                        </Box>{' '}
                                        <Box
                                            component="span"
                                            sx={{
                                                color: 'text.secondary',
                                                textDecoration: 'line-through',
                                            }}
                                        >
                                            {line.stationName}
                                        </Box>
                                    </Typography>
                                </Box>
                            ))}
                        </SectionCard>
                    )}
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
                    className="btn-primary-admin"
                    disabled={isPending}
                >
                    {isPending ? 'Đang xử lý...' : 'Xác nhận & Lưu'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
