"use client";

import {
    Alert,
    Box,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import ReplayIcon from '@mui/icons-material/Replay';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useMemo, useState } from 'react';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { AppToast } from '../../../../../../utils/toast.util';
import { FIELD_LABELS, SCAN_IMPORT_OUTCOME_META, SCAN_STATUS_META } from '../../constants/scan-status.config';
import {
    ConfirmedScannedTicketPayload,
    EditableScannedTicket,
    ScanBatchImportResult,
    ScannedTicket,
    TicketScanResult,
} from '../../types/ticketScan.type';
import { TicketScanBoundingBoxOverview } from './TicketScanBoundingBoxOverview';

const toEditable = (ticket: ScannedTicket, index: number): EditableScannedTicket => ({
    ...ticket,
    clientId: `${ticket.ticketIndex}-${index}`,
    included: true,
    editedNumbers: ticket.extracted?.numbers ?? '',
    editedSerialNumber: ticket.extracted?.serialNumber ?? '',
});

interface TicketScanReviewDialogProps {
    open: boolean;
    onClose: () => void;
    sourceImageUrl: string | null;
    scanResult: TicketScanResult | null;
    scanError: string | null;
    isScanning: boolean;
    onRetryScan: () => void;
    isConfirming: boolean;
    onConfirm: (tickets: ConfirmedScannedTicketPayload[]) => void;
    importResult: ScanBatchImportResult | null;
}

export const TicketScanReviewDialog = ({
    open,
    onClose,
    sourceImageUrl,
    scanResult,
    scanError,
    isScanning,
    onRetryScan,
    isConfirming,
    onConfirm,
    importResult,
}: TicketScanReviewDialogProps) => {
    const [tickets, setTickets] = useState<EditableScannedTicket[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, { numbers?: string; serialNumber?: string }>>({});

    useEffect(() => {
        if (scanResult) {
            setTickets(scanResult.tickets.map(toEditable));
            setFieldErrors({});
        } else {
            setTickets([]);
        }
    }, [scanResult]);

    const includedCount = useMemo(() => tickets.filter((t) => t.included).length, [tickets]);

    const updateTicket = (clientId: string, patch: Partial<EditableScannedTicket>) => {
        setTickets((prev) => prev.map((t) => (t.clientId === clientId ? { ...t, ...patch } : t)));
        setFieldErrors((prev) => {
            if (!(clientId in prev)) return prev;
            const next = { ...prev };
            delete next[clientId];
            return next;
        });
    };

    const handleConfirmClick = () => {
        const included = tickets.filter((t) => t.included);
        if (included.length === 0) {
            AppToast.error('Vui lòng chọn ít nhất một vé để nhập kho.');
            return;
        }

        const nextErrors: Record<string, { numbers?: string; serialNumber?: string }> = {};
        included.forEach((t) => {
            const errs: { numbers?: string; serialNumber?: string } = {};
            if (!t.editedNumbers.trim()) errs.numbers = 'Dãy số không được để trống';
            if (!t.editedSerialNumber.trim()) errs.serialNumber = 'Số sê-ri không được để trống';
            if (errs.numbers || errs.serialNumber) nextErrors[t.clientId] = errs;
        });

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            AppToast.error('Một số vé đã chọn còn thiếu dãy số hoặc số sê-ri. Vui lòng bổ sung hoặc bỏ chọn.');
            return;
        }

        const payload: ConfirmedScannedTicketPayload[] = included.map((t) => ({
            numbers: t.editedNumbers.trim(),
            serialNumber: t.editedSerialNumber.trim(),
            ticketImageBase64: t.croppedImageBase64 || undefined,
            ocrScanResultId: t.ocrScanResultId ?? undefined,
        }));
        onConfirm(payload);
    };

    const showResults = !!importResult;

    return (
        <Dialog open={open} onClose={isConfirming ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" fontWeight={700}>
                    {showResults
                        ? 'Kết quả nhập kho từ ảnh quét'
                        : 'Xem lại vé quét được'}
                </Typography>
                <IconButton size="small" onClick={onClose} disabled={isConfirming}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {isScanning && (
                    <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
                        <CircularProgress size={36} />
                        <Typography color="text.secondary">Đang gửi ảnh và chờ AI Vision OCR xử lý…</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Có thể mất vài giây với ảnh chứa nhiều vé.
                        </Typography>
                    </Stack>
                )}

                {!isScanning && scanError && (
                    <Stack spacing={2} sx={{ py: 2 }}>
                        <Alert severity="error">{scanError}</Alert>
                        <Box>
                            <LoadingButton
                                variant="outlined"
                                color="error"
                                label="Thử quét lại"
                                startIcon={<ReplayIcon />}
                                onClick={onRetryScan}
                            />
                        </Box>
                    </Stack>
                )}

                {!isScanning && !scanError && showResults && importResult && (
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={1.5}>
                            <Chip
                                color="success"
                                label={`${importResult.successCount} thành công`}
                                variant={importResult.successCount > 0 ? 'filled' : 'outlined'}
                            />
                            <Chip
                                color="warning"
                                label={`${importResult.duplicateCount} trùng lặp`}
                                variant={importResult.duplicateCount > 0 ? 'filled' : 'outlined'}
                            />
                            <Chip
                                color="error"
                                label={`${importResult.failedCount} thất bại`}
                                variant={importResult.failedCount > 0 ? 'filled' : 'outlined'}
                            />
                        </Stack>
                        <List dense disablePadding>
                            {importResult.results.map((item, idx) => {
                                const meta = SCAN_IMPORT_OUTCOME_META[item.outcome];
                                return (
                                    <ListItem key={idx} divider>
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            {item.outcome === 'SUCCESS' && <CheckCircleIcon color="success" />}
                                            {item.outcome === 'DUPLICATE' && <WarningAmberIcon color="warning" />}
                                            {item.outcome === 'FAILED' && <ErrorIcon color="error" />}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={`Dãy số ${item.numbers ?? '—'} • Sê-ri ${item.serialNumber ?? '—'}`}
                                            secondary={item.message}
                                        />
                                        <Chip size="small" color={meta.color} label={meta.label} />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Stack>
                )}

                {!isScanning && !scanError && !showResults && scanResult && (
                    <Stack spacing={3}>
                        {scanResult.warnings && scanResult.warnings.length > 0 && (
                            <Alert severity="info">
                                {scanResult.warnings.join(' ')}
                            </Alert>
                        )}

                        {scanResult.tickets.length === 0 ? (
                            <Alert severity="warning">
                                Không phát hiện được vé số nào trong ảnh. Hãy thử chụp lại với ánh sáng tốt hơn hoặc
                                ít vé chồng lấn hơn.
                            </Alert>
                        ) : (
                            <>
                                {sourceImageUrl && (
                                    <TicketScanBoundingBoxOverview
                                        imageUrl={sourceImageUrl}
                                        tickets={scanResult.tickets}
                                    />
                                )}

                                <Divider />

                                <Typography variant="subtitle2" color="text.secondary">
                                    Phát hiện {scanResult.ticketCount} vé — đã chọn {includedCount} vé để nhập kho.
                                    Vui lòng kiểm tra/sửa các vé màu vàng (cần kiểm tra) hoặc đỏ (thiếu/lỗi) trước khi
                                    xác nhận.
                                </Typography>

                                <Stack spacing={2}>
                                    {tickets.map((ticket) => {
                                        const meta = SCAN_STATUS_META[ticket.status] ?? SCAN_STATUS_META.COMPLETE;
                                        const errors = fieldErrors[ticket.clientId];
                                        const allMessages = [
                                            ...(ticket.missingFields ?? []).map(
                                                (f) => `Thiếu ${FIELD_LABELS[f] ?? f}`
                                            ),
                                            ...(ticket.validationErrors ?? []),
                                            ...(ticket.businessValidationErrors ?? []),
                                        ];

                                        return (
                                            <Box
                                                key={ticket.clientId}
                                                sx={{
                                                    display: 'flex',
                                                    gap: 2,
                                                    p: 2,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 2,
                                                    opacity: ticket.included ? 1 : 0.5,
                                                }}
                                            >
                                                <Checkbox
                                                    checked={ticket.included}
                                                    onChange={(e) =>
                                                        updateTicket(ticket.clientId, { included: e.target.checked })
                                                    }
                                                    sx={{ alignSelf: 'flex-start' }}
                                                />

                                                <Box
                                                    sx={{
                                                        width: 96,
                                                        height: 128,
                                                        flexShrink: 0,
                                                        borderRadius: 1,
                                                        overflow: 'hidden',
                                                        bgcolor: 'grey.100',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {ticket.croppedImageBase64 ? (
                                                        <img
                                                            src={`data:image/jpeg;base64,${ticket.croppedImageBase64}`}
                                                            alt={`Vé #${ticket.ticketIndex + 1}`}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <ImageNotSupportedIcon color="disabled" />
                                                    )}
                                                </Box>

                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={1}
                                                        sx={{ mb: 1 }}
                                                        flexWrap="wrap"
                                                    >
                                                        <Typography variant="subtitle2" fontWeight={700}>
                                                            Vé #{ticket.ticketIndex + 1}
                                                        </Typography>
                                                        <Chip size="small" color={meta.color} label={meta.label} />
                                                        <Chip
                                                            size="small"
                                                            variant="outlined"
                                                            label={`Độ tin cậy ${Math.round(ticket.confidence * 100)}%`}
                                                        />
                                                        {ticket.duplicate && (
                                                            <Chip
                                                                size="small"
                                                                color="warning"
                                                                variant="outlined"
                                                                label="Có thể trùng lặp"
                                                            />
                                                        )}
                                                        {ticket.extracted?.stationName && (
                                                            <Tooltip title="Đài quét được từ OCR (chỉ để đối chiếu)">
                                                                <Chip
                                                                    size="small"
                                                                    variant="outlined"
                                                                    label={ticket.extracted.stationName}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </Stack>

                                                    <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                                                        <TextField
                                                            size="small"
                                                            label="Dãy số"
                                                            value={ticket.editedNumbers}
                                                            onChange={(e) =>
                                                                updateTicket(ticket.clientId, {
                                                                    editedNumbers: e.target.value,
                                                                })
                                                            }
                                                            error={!!errors?.numbers}
                                                            helperText={errors?.numbers}
                                                            disabled={!ticket.included}
                                                            fullWidth
                                                        />
                                                        <TextField
                                                            size="small"
                                                            label="Số sê-ri"
                                                            value={ticket.editedSerialNumber}
                                                            onChange={(e) =>
                                                                updateTicket(ticket.clientId, {
                                                                    editedSerialNumber: e.target.value,
                                                                })
                                                            }
                                                            error={!!errors?.serialNumber}
                                                            helperText={errors?.serialNumber}
                                                            disabled={!ticket.included}
                                                            fullWidth
                                                        />
                                                    </Stack>

                                                    {allMessages.length > 0 && (
                                                        <Stack spacing={0.25}>
                                                            {allMessages.map((msg, i) => (
                                                                <Typography
                                                                    key={i}
                                                                    variant="caption"
                                                                    color={
                                                                        ticket.status === 'INCOMPLETE'
                                                                            ? 'error.main'
                                                                            : 'warning.main'
                                                                    }
                                                                >
                                                                    • {msg}
                                                                </Typography>
                                                            ))}
                                                        </Stack>
                                                    )}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </>
                        )}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                {showResults ? (
                    <>
                        <span />
                        <LoadingButton
                            variant="contained"
                            label="Đóng"
                            onClick={onClose}
                        />
                    </>
                ) : (
                    <>
                        <LoadingButton
                            variant="outlined"
                            label="Quét lại ảnh khác"
                            startIcon={<ReplayIcon />}
                            onClick={onRetryScan}
                            disabled={isScanning || isConfirming}
                        />
                        <Stack direction="row" spacing={1.5}>
                            <LoadingButton
                                variant="outlined"
                                color="inherit"
                                label="Hủy"
                                onClick={onClose}
                                disabled={isConfirming}
                            />
                            <LoadingButton
                                variant="contained"
                                color="primary"
                                label={`Xác nhận nhập kho (${includedCount} vé)`}
                                loading={isConfirming}
                                loadingLabel="Đang nhập kho…"
                                onClick={handleConfirmClick}
                                disabled={isScanning || !!scanError || includedCount === 0}
                            />
                        </Stack>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};
