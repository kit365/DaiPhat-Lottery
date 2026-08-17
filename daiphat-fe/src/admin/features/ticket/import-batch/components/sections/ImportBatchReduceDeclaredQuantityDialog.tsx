"use client";

import CloseIcon from '@mui/icons-material/Close';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    LinearProgress,
    Stack,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useImportBatchReductionTickets } from '../../hooks/useImportBatch';
import type {
    ImportBatchReductionLine,
    ImportBatchReductionTicket,
} from '../../types/importBatch.type';
import { sumSelectedTicketSerialCount } from '../../utils/importBatchDeclareQuantityReduction';
import { AdminLuckyDisplay } from '@/shared/lucky-number';

interface ImportBatchReduceDeclaredQuantityDialogProps {
    open: boolean;
    batchId: number;
    targetTotalDeclareQuantity: number;
    excessToRemove: number;
    isSubmitting?: boolean;
    onClose: () => void;
    onConfirm: (removedTicketIds: number[]) => void;
}

export const ImportBatchReduceDeclaredQuantityDialog = ({
    open,
    batchId,
    targetTotalDeclareQuantity,
    excessToRemove,
    isSubmitting = false,
    onClose,
    onConfirm,
}: ImportBatchReduceDeclaredQuantityDialogProps) => {
    const [activeTab, setActiveTab] = useState(0);
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(new Set());

    const { data: reductionData, isLoading, isError, refetch } = useImportBatchReductionTickets(batchId, open);

    const lines = reductionData?.lines ?? [];

    useEffect(() => {
        if (!open) {
            setSelectedTicketIds(new Set());
            setActiveTab(0);
            return;
        }
        refetch();
    }, [open, refetch]);

    const ticketsById = useMemo(() => {
        const map = new Map<number, number>();
        lines.forEach((line) => {
            line.tickets.forEach((ticket) => {
                map.set(ticket.id, ticket.serialCount);
            });
        });
        return map;
    }, [lines]);

    const removedSerialCount = useMemo(
        () => sumSelectedTicketSerialCount(selectedTicketIds, ticketsById),
        [selectedTicketIds, ticketsById]
    );

    const progressPercent =
        excessToRemove > 0 ? Math.min(100, (removedSerialCount / excessToRemove) * 100) : 0;
    const canConfirm = removedSerialCount === excessToRemove && excessToRemove > 0 && !isSubmitting;

    const activeLine: ImportBatchReductionLine | undefined = lines[activeTab];

    const toggleTicket = (ticket: ImportBatchReductionTicket, deletable: boolean) => {
        if (!deletable) {
            return;
        }

        setSelectedTicketIds((prev) => {
            const next = new Set(prev);
            if (next.has(ticket.id)) {
                next.delete(ticket.id);
            } else {
                next.add(ticket.id);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        if (!canConfirm) {
            return;
        }
        onConfirm(Array.from(selectedTicketIds));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ pb: 1, pr: 6 }}>
                Xóa vé thừa trước khi giảm số lượng khai báo
                <IconButton
                    aria-label="Đóng"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 12, top: 12 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={2}>
                    <Alert severity="warning">
                        Số lượng khai báo mới ({targetTotalDeclareQuantity.toLocaleString('vi-VN')} vé) nhỏ hơn số vé
                        đã nhập. Vui lòng chọn và xóa đủ {excessToRemove.toLocaleString('vi-VN')} vé thuộc các dòng
                        OPEN, IMPORTING hoặc PAUSED trước khi áp dụng.
                    </Alert>

                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Tiến độ xóa vé thừa
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {removedSerialCount.toLocaleString('vi-VN')} / {excessToRemove.toLocaleString('vi-VN')}{' '}
                                vé đã chọn
                            </Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 1 }} />
                    </Box>

                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : isError ? (
                        <Alert severity="error">Không thể tải danh sách vé. Vui lòng thử lại.</Alert>
                    ) : lines.length === 0 ? (
                        <Alert severity="info">Không có dòng phiếu nhập lô nào để hiển thị.</Alert>
                    ) : (
                        <>
                            <Tabs
                                value={activeTab}
                                onChange={(_, value) => setActiveTab(value)}
                                variant="scrollable"
                                scrollButtons="auto"
                            >
                                {lines.map((line) => (
                                    <Tab
                                        key={line.lineId}
                                        label={`${line.stationName} (${line.importedQuantity})`}
                                    />
                                ))}
                            </Tabs>

                            {activeLine && (
                                <Box>
                                    {!activeLine.deletable && (
                                        <Alert severity="info" sx={{ mb: 1.5 }}>
                                            Dòng này đã nhập hoàn tất (IMPORTED). Không thể xóa vé ở trạng thái này.
                                        </Alert>
                                    )}

                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell padding="checkbox" />
                                                    <TableCell>Dãy số</TableCell>
                                                    <TableCell>Sê-ri</TableCell>
                                                    <TableCell align="right">Số lượng vé</TableCell>
                                                    <TableCell>Trạng thái</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {activeLine.tickets.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5}>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Chưa có vé nào được nhập cho nhà đài này.
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    activeLine.tickets.map((ticket) => (
                                                        <TableRow key={ticket.id} hover>
                                                            <TableCell padding="checkbox">
                                                                <Checkbox
                                                                    checked={selectedTicketIds.has(ticket.id)}
                                                                    disabled={!activeLine.deletable}
                                                                    onChange={() =>
                                                                        toggleTicket(ticket, activeLine.deletable)
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <AdminLuckyDisplay value={ticket.numbers} ticket />
                                                            </TableCell>
                                                            <TableCell>{ticket.serialNumber || '—'}</TableCell>
                                                            <TableCell align="right">
                                                                {ticket.serialCount.toLocaleString('vi-VN')}
                                                            </TableCell>
                                                            <TableCell>{ticket.status || '—'}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                <Button onClick={onClose} color="inherit" variant="outlined" disabled={isSubmitting}>
                    Hủy
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!canConfirm}
                    className="btn-primary-admin"
                >
                    {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
