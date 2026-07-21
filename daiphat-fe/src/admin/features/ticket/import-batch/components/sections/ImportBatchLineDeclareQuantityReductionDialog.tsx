import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getImportBatchReductionTickets } from '../../services/importBatchService';
import type { ImportBatchLineStatus, ImportBatchReductionTicket } from '../../types/importBatch.type';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { sumSelectedTicketSerialCount } from '../../utils/importBatchDeclareQuantityReduction';
import { canRedistributeImportBatchLineDeclareQuantity } from '../../utils/importBatchHeaderEdit';
import {
    formatViInteger,
    parseNonNegativeIntegerInput,
} from '../../../../supplier';

export type LineDeclareRedistributionRow = {
    id: number;
    stationName: string;
    status?: ImportBatchLineStatus | 'DRAFT';
    declareQuantity: number;
    totalQuantity: number;
    removed?: boolean;
};

export type LineDeclareQuantityReductionConfirmResult = {
    removedTicketIds: number[];
    totalDeclareQuantity: number;
    lineDeclares: Record<number, number>;
    confirmPausedLineImported?: boolean;
};

type ImportedMatchDecision = 'confirm' | 'cancel' | null;

interface ImportBatchLineDeclareQuantityReductionDialogProps {
    open: boolean;
    batchId: number;
    lineId: number;
    stationName: string;
    oldDeclare: number;
    newDeclare: number;
    serverImported: number;
    draftSerialCount: number;
    lines: LineDeclareRedistributionRow[];
    currentTotalDeclareQuantity: number;
    isSubmitting?: boolean;
    onClose: () => void;
    onConfirm: (result: LineDeclareQuantityReductionConfirmResult) => void;
}

export const ImportBatchLineDeclareQuantityReductionDialog = ({
    open,
    batchId,
    lineId,
    stationName,
    oldDeclare,
    newDeclare,
    serverImported,
    draftSerialCount,
    lines,
    currentTotalDeclareQuantity,
    isSubmitting = false,
    onClose,
    onConfirm,
}: ImportBatchLineDeclareQuantityReductionDialogProps) => {
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(new Set());
    const [totalDeclareQuantity, setTotalDeclareQuantity] = useState(currentTotalDeclareQuantity);
    const [lineDeclares, setLineDeclares] = useState<Record<number, number>>({});
    const [importedMatchDecision, setImportedMatchDecision] =
        useState<ImportedMatchDecision>(null);

    const { data: reductionData, isLoading, isError, refetch } = useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_REDUCTION_TICKETS, batchId],
        queryFn: () => getImportBatchReductionTickets(batchId),
        enabled: open && !!batchId,
        select: (res) => res.data ?? null,
    });

    const targetLineTickets = useMemo(() => {
        const line = reductionData?.lines?.find((item) => item.lineId === lineId);
        return line?.tickets ?? [];
    }, [reductionData, lineId]);

    const ticketsById = useMemo(() => {
        const map = new Map<number, number>();
        targetLineTickets.forEach((ticket) => {
            map.set(ticket.id, ticket.serialCount);
        });
        return map;
    }, [targetLineTickets]);

    useEffect(() => {
        if (!open) {
            setSelectedTicketIds(new Set());
            setImportedMatchDecision(null);
            return;
        }

        const defaults: Record<number, number> = {};
        lines.forEach((line) => {
            if (line.removed) {
                return;
            }
            defaults[line.id] = line.id === lineId ? newDeclare : line.declareQuantity;
        });
        setLineDeclares(defaults);
        const initialDelta = newDeclare - oldDeclare;
        setTotalDeclareQuantity(Math.max(1, currentTotalDeclareQuantity + initialDelta));
        setSelectedTicketIds(new Set());
        setImportedMatchDecision(null);
        refetch();
    }, [open, lines, lineId, newDeclare, oldDeclare, currentTotalDeclareQuantity, refetch]);

    const targetDeclare = lineDeclares[lineId] ?? newDeclare;
    const serverExcess = Math.max(0, serverImported - targetDeclare);
    const declareDelta = targetDeclare - oldDeclare;
    const draftToClear = draftSerialCount > 0 && targetDeclare < serverImported + draftSerialCount;
    const matchesImported =
        declareDelta !== 0 && targetDeclare === serverImported && serverImported > 0;

    const removedSerialCount = useMemo(
        () => sumSelectedTicketSerialCount(selectedTicketIds, ticketsById),
        [selectedTicketIds, ticketsById]
    );

    const activeRedistributionLines = useMemo(
        () => lines.filter((line) => !line.removed && line.id),
        [lines]
    );

    const linesSum = useMemo(
        () =>
            activeRedistributionLines.reduce(
                (sum, line) => sum + (lineDeclares[line.id] ?? line.declareQuantity),
                0
            ),
        [activeRedistributionLines, lineDeclares]
    );

    const quantitiesMatch = linesSum === totalDeclareQuantity;

    const lineDeclareValid = useMemo(() => {
        return activeRedistributionLines.every((line) => {
            const declare = lineDeclares[line.id] ?? line.declareQuantity;
            if (declare < 1) {
                return false;
            }
            const postDeleteImported =
                line.id === lineId
                    ? Math.max(0, serverImported - removedSerialCount)
                    : line.totalQuantity;
            return declare >= postDeleteImported;
        });
    }, [
        activeRedistributionLines,
        lineDeclares,
        lineId,
        serverImported,
        removedSerialCount,
    ]);

    const ticketsExact = serverExcess === 0 || removedSerialCount === serverExcess;
    const progressPercent =
        serverExcess > 0 ? Math.min(100, (removedSerialCount / serverExcess) * 100) : 100;
    const declareChanged = targetDeclare !== oldDeclare;

    const canConfirm =
        declareChanged &&
        ticketsExact &&
        quantitiesMatch &&
        lineDeclareValid &&
        totalDeclareQuantity >= 1 &&
        !isSubmitting &&
        (!matchesImported || importedMatchDecision === 'confirm');

    const toggleTicket = (ticket: ImportBatchReductionTicket) => {
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

    const updateTargetDeclare = (parsed: number) => {
        setLineDeclares((prev) => {
            const next = {
                ...prev,
                [lineId]: parsed,
            };
            setTotalDeclareQuantity(
                Math.max(1, currentTotalDeclareQuantity + (parsed - oldDeclare))
            );
            return next;
        });
        setImportedMatchDecision(null);
        setSelectedTicketIds(new Set());
    };

    const handleRejectImportedMatch = () => {
        setImportedMatchDecision('cancel');
        updateTargetDeclare(oldDeclare);
    };

    const handleConfirm = () => {
        if (!canConfirm) {
            return;
        }
        onConfirm({
            removedTicketIds: Array.from(selectedTicketIds),
            totalDeclareQuantity,
            lineDeclares,
            confirmPausedLineImported: matchesImported ? true : undefined,
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ pb: 1, pr: 6 }}>
                Điều chỉnh số lượng khai báo dòng tạm dừng
                <IconButton
                    aria-label="Đóng"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 12, top: 12 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={2.5}>
                    <Alert severity="warning">
                        Dòng <strong>{stationName}</strong>: số lượng khai báo hiện tại{' '}
                        {oldDeclare.toLocaleString('vi-VN')} vé → đang đặt{' '}
                        {targetDeclare.toLocaleString('vi-VN')} vé
                        (đã nhập server: {serverImported.toLocaleString('vi-VN')}
                        {draftSerialCount > 0
                            ? `, nháp chưa lưu: ${draftSerialCount.toLocaleString('vi-VN')}`
                            : ''}
                        ).
                        {matchesImported ? (
                            <> Số lượng khai báo khớp với số vé đã nhập.</>
                        ) : serverExcess > 0 ? (
                            <>
                                {' '}
                                Cần xóa <strong>{serverExcess.toLocaleString('vi-VN')}</strong> vé trên
                                server
                                {draftToClear ? ' và xóa vé nháp chưa lưu của dòng này' : ''}.
                            </>
                        ) : draftToClear ? (
                            <> Cần xóa vé nháp chưa lưu vượt quá số lượng mới.</>
                        ) : declareDelta > 0 ? (
                            <> Số lượng tăng thêm {declareDelta.toLocaleString('vi-VN')} vé.</>
                        ) : (
                            <> Nhập số lượng khai báo mới bên dưới để tiếp tục.</>
                        )}
                    </Alert>

                    <TextField
                        label="Số lượng khai báo dòng tạm dừng"
                        size="small"
                        value={formatViInteger(targetDeclare)}
                        onChange={(e) => {
                            const parsed = parseNonNegativeIntegerInput(e.target.value) ?? 0;
                            updateTargetDeclare(parsed);
                        }}
                        sx={{ maxWidth: 280 }}
                        inputProps={{ inputMode: 'numeric', min: 1 }}
                    />

                    {matchesImported && (
                        <Alert
                            severity="info"
                            sx={{
                                '& .MuiAlert-message': { width: '100%' },
                            }}
                        >
                            <Typography variant="body2" sx={{ mb: 1.5 }}>
                                Số lượng khai báo hiện khớp với số vé đã nhập. Bạn có muốn xác nhận và
                                đánh dấu dòng này là Đã nhập đủ (IMPORTED)?
                            </Typography>
                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    size="small"
                                    variant={
                                        importedMatchDecision === 'confirm'
                                            ? 'contained'
                                            : 'outlined'
                                    }
                                    color="success"
                                    startIcon={<CheckCircleOutlineIcon />}
                                    onClick={() => setImportedMatchDecision('confirm')}
                                    disabled={isSubmitting}
                                >
                                    Xác nhận
                                </Button>
                                <Button
                                    size="small"
                                    variant={
                                        importedMatchDecision === 'cancel'
                                            ? 'contained'
                                            : 'outlined'
                                    }
                                    color="inherit"
                                    startIcon={<CancelOutlinedIcon />}
                                    onClick={handleRejectImportedMatch}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </Button>
                            </Stack>
                            {importedMatchDecision == null && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mt: 1.25 }}
                                >
                                    Nút Tiếp tục sẽ bị khóa cho đến khi bạn chọn Xác nhận hoặc Hủy.
                                </Typography>
                            )}
                        </Alert>
                    )}

                    {!matchesImported && serverExcess > 0 && (
                        <Box>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mb: 1 }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Tiến độ chọn vé cần xóa
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {removedSerialCount.toLocaleString('vi-VN')} /{' '}
                                    {serverExcess.toLocaleString('vi-VN')} vé
                                </Typography>
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={progressPercent}
                                sx={{ height: 8, borderRadius: 1 }}
                            />
                        </Box>
                    )}

                    {!matchesImported && serverExcess > 0 && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Vé sẽ bị xóa ({stationName})
                            </Typography>
                            {isLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : isError ? (
                                <Alert severity="error">
                                    Không thể tải danh sách vé. Vui lòng thử lại.
                                </Alert>
                            ) : targetLineTickets.length === 0 ? (
                                <Alert severity="info">Không có vé nào trên dòng này để xóa.</Alert>
                            ) : (
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
                                            {targetLineTickets.map((ticket) => (
                                                <TableRow key={ticket.id} hover>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            checked={selectedTicketIds.has(ticket.id)}
                                                            onChange={() => toggleTicket(ticket)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{ticket.numbers || '—'}</TableCell>
                                                    <TableCell>
                                                        {ticket.serialNumber || '—'}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {ticket.serialCount.toLocaleString('vi-VN')}
                                                    </TableCell>
                                                    <TableCell>{ticket.status || '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}

                    {!matchesImported && draftToClear && (
                        <Alert severity="info">
                            Có {draftSerialCount.toLocaleString('vi-VN')} vé đang nhập nháp (chưa lưu)
                            cho dòng này. Khi tiếp tục, bản nháp đó sẽ bị xóa khỏi trình duyệt.
                        </Alert>
                    )}

                    {!matchesImported && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Phân bổ số lượng khai báo
                                {declareDelta !== 0
                                    ? ` (thay đổi ${declareDelta > 0 ? '+' : ''}${declareDelta.toLocaleString('vi-VN')} vé trên dòng tạm dừng)`
                                    : ''}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 1.5 }}
                            >
                                Tổng số lượng khai báo phiếu phải bằng tổng số lượng khai báo các dòng.
                                Chỉnh số lượng dòng tạm dừng bên dưới; có thể điều chỉnh tổng phiếu
                                và/hoặc các dòng khác.
                            </Typography>

                            <Stack spacing={1.5}>
                                <TextField
                                    label="Tổng số lượng khai báo phiếu nhập lô"
                                    size="small"
                                    value={formatViInteger(totalDeclareQuantity)}
                                    onChange={(e) => {
                                        setTotalDeclareQuantity(
                                            parseNonNegativeIntegerInput(e.target.value) ?? 0
                                        );
                                    }}
                                    sx={{ maxWidth: 360 }}
                                    inputProps={{ inputMode: 'numeric' }}
                                />

                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Nhà đài</TableCell>
                                                <TableCell>Trạng thái</TableCell>
                                                <TableCell align="right">Đã nhập</TableCell>
                                                <TableCell align="right" sx={{ width: 140 }}>
                                                    Số lượng khai báo
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {activeRedistributionLines.map((line) => {
                                                const isTarget = line.id === lineId;
                                                const editable =
                                                    isTarget ||
                                                    canRedistributeImportBatchLineDeclareQuantity(
                                                        line.status
                                                    );
                                                const postDeleteImported = isTarget
                                                    ? Math.max(
                                                          0,
                                                          serverImported - removedSerialCount
                                                      )
                                                    : line.totalQuantity;
                                                return (
                                                    <TableRow key={line.id}>
                                                        <TableCell>
                                                            {line.stationName}
                                                            {isTarget ? ' (đang điều chỉnh)' : ''}
                                                        </TableCell>
                                                        <TableCell>
                                                            {line.status || '—'}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {postDeleteImported.toLocaleString(
                                                                'vi-VN'
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                size="small"
                                                                value={formatViInteger(
                                                                    lineDeclares[line.id] ??
                                                                        line.declareQuantity
                                                                )}
                                                                disabled={!editable}
                                                                onChange={(e) => {
                                                                    const parsed =
                                                                        parseNonNegativeIntegerInput(
                                                                            e.target.value
                                                                        ) ?? 0;
                                                                    if (isTarget) {
                                                                        updateTargetDeclare(parsed);
                                                                        return;
                                                                    }
                                                                    setLineDeclares((prev) => ({
                                                                        ...prev,
                                                                        [line.id]: parsed,
                                                                    }));
                                                                }}
                                                                inputProps={{
                                                                    inputMode: 'numeric',
                                                                }}
                                                                sx={{ width: 120 }}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <Typography
                                    variant="body2"
                                    color={quantitiesMatch ? 'success.main' : 'error.main'}
                                    sx={{ fontWeight: 600 }}
                                >
                                    Tổng dòng: {linesSum.toLocaleString('vi-VN')} / Tổng phiếu:{' '}
                                    {totalDeclareQuantity.toLocaleString('vi-VN')}
                                    {quantitiesMatch ? ' (khớp)' : ' (chưa khớp)'}
                                </Typography>
                            </Stack>
                        </Box>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                <Button onClick={onClose} color="inherit" variant="outlined" disabled={isSubmitting}>
                    Đóng
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!canConfirm}
                    className="btn-primary-admin"
                >
                    {isSubmitting ? 'Đang xử lý...' : 'Tiếp tục'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
