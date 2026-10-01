"use client";

import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { ROUTES } from '../../../../../constants/routes';
import { useStations } from '../../../../station/hooks/useStation';
import { useEligibleImportBatchStations, useUpdateImportBatch } from '../../hooks/useImportBatch';
import { computeImportCostFromStation, formatImportCost, formatVnd } from '../../utils/importCostCalculator';
import { getFileAllocationCoverageIssues } from '../../utils/importBatchFileAllocationCoverage';
import { formatViInteger, parseNonNegativeIntegerInput, preventNumberInputWheel } from '../../../../supplier';
import type {
    ImportBatch,
    ImportBatchEligibleStation,
    ImportBatchFileStationSummary,
    UpdateImportBatchPayload,
} from '../../types/importBatch.type';

export interface EditableBatchLine {
    tempKey: string;
    id?: number;
    lotteryStationId: number;
    stationName?: string;
    declareQuantity: number;
    importCost: number;
    totalQuantity: number;
    isExisting: boolean;
    isRemoved?: boolean;
}

export interface ImportBatchQuickAllocationModalProps {
    open: boolean;
    onClose: () => void;
    batch: ImportBatch | null;
    fileStations?: ImportBatchFileStationSummary[];
    sourceLabel?: string;
    onBatchUpdated: () => Promise<void> | void;
}

const formatDate = (val?: string) => (val ? dayjs(val).format('DD/MM/YYYY') : '—');

export const ImportBatchQuickAllocationModal = ({
    open,
    onClose,
    batch,
    fileStations = [],
    sourceLabel = 'Tệp',
    onBatchUpdated,
}: ImportBatchQuickAllocationModalProps) => {
    const router = useAdminRouter();
    const sourceReference = sourceLabel.charAt(0).toLowerCase() + sourceLabel.slice(1);
    const batchId = batch?.id;
    const { mutateAsync: updateBatchAsync, isPending: isUpdating } = useUpdateImportBatch(batchId);

    const { data: eligibleData, isLoading: isLoadingStations } = useEligibleImportBatchStations(
        batch?.drawDate,
        batch?.importMode ?? 'IN_DAY',
        batch?.id
    );

    const eligibleStations: ImportBatchEligibleStation[] = useMemo(
        () => eligibleData?.eligible ?? [],
        [eligibleData]
    );
    const { data: stationResult } = useStations({ limit: 1000 });
    const stationById = useMemo(() => {
        const stationMap = new Map<number, { name: string; price?: number; commissionRate?: number }>();
        (stationResult?.data?.recordList ?? []).forEach((station) => {
            stationMap.set(station.id, station);
        });
        eligibleStations.forEach((station) => {
            const current = stationMap.get(station.lotteryStationId);
            stationMap.set(station.lotteryStationId, {
                name: station.name,
                price: station.price ?? current?.price,
                commissionRate: station.commissionRate ?? current?.commissionRate,
            });
        });
        return stationMap;
    }, [eligibleStations, stationResult]);

    const [lines, setLines] = useState<EditableBatchLine[]>([]);
    const [saveAttempted, setSaveAttempted] = useState(false);

    // Initialize lines when dialog opens or batch changes
    useEffect(() => {
        if (!open || !batch) {
            setLines([]);
            setSaveAttempted(false);
            return;
        }

        const existingLines: EditableBatchLine[] = (batch.lines ?? [])
            .filter((line) => line.status !== 'CANCELLED')
            .map((line) => ({
                    tempKey: `line-${line.id}-${line.lotteryStationId}`,
                    id: line.id,
                    lotteryStationId: line.lotteryStationId,
                    stationName: `Nhà đài #${line.lotteryStationId}`,
                    declareQuantity: line.declareQuantity ?? 0,
                    importCost: line.importCost ?? 9500,
                    totalQuantity: line.totalQuantity ?? 0,
                    isExisting: true,
                    isRemoved: false,
            }));

        setLines(existingLines);
    }, [open, batch]);

    // Active (non-removed) lines
    const activeLines = useMemo(() => lines.filter((l) => !l.isRemoved), [lines]);

    // Selected station IDs among active lines
    const selectedStationIds = useMemo(
        () => activeLines.map((l) => l.lotteryStationId).filter((id) => id > 0),
        [activeLines]
    );

    // Identify stations in file that are missing in the current lines
    const missingFileStations = useMemo(() => {
        if (!fileStations.length) return [];
        return fileStations.filter(
            (fs) => !activeLines.some((l) => l.lotteryStationId === fs.lotteryStationId)
        );
    }, [fileStations, activeLines]);

    // Add empty line
    const handleAddLine = () => {
        const available = eligibleStations.filter((s) => !selectedStationIds.includes(s.lotteryStationId));
        const firstAvailable = available[0];

        const firstPricing = firstAvailable ? stationById.get(firstAvailable.lotteryStationId) : undefined;
        const defaultCost = firstAvailable
            ? (computeImportCostFromStation(firstPricing?.price, firstPricing?.commissionRate) ?? 9500)
            : 9500;

        const newLine: EditableBatchLine = {
            tempKey: `new-${Date.now()}-${Math.random()}`,
            lotteryStationId: firstAvailable ? firstAvailable.lotteryStationId : 0,
            stationName: firstAvailable?.name,
            declareQuantity: 100,
            importCost: defaultCost,
            totalQuantity: 0,
            isExisting: false,
            isRemoved: false,
        };

        setLines((prev) => [...prev, newLine]);
    };

    // Auto-add all missing stations from the file
    const handleAutoAddMissingFromSchedule = () => {
        if (!missingFileStations.length) return;

        const newEntries: EditableBatchLine[] = missingFileStations.map((fs) => {
            const matchedEligible = eligibleStations.find((s) => s.lotteryStationId === fs.lotteryStationId);
            const pricing = stationById.get(fs.lotteryStationId);
            const defaultCost = pricing
                ? (computeImportCostFromStation(pricing.price, pricing.commissionRate) ?? 9500)
                : fs.importCost || 9500;

            const neededQty = fs.serialCount > 0 ? fs.serialCount : fs.declaredQuantity > 0 ? fs.declaredQuantity : 100;

            return {
                tempKey: `auto-${fs.lotteryStationId}-${Date.now()}`,
                lotteryStationId: fs.lotteryStationId,
                stationName: fs.stationName || matchedEligible?.name || `Nhà đài #${fs.lotteryStationId}`,
                declareQuantity: neededQty,
                importCost: defaultCost,
                totalQuantity: 0,
                isExisting: false,
                isRemoved: false,
            };
        });

        setLines((prev) => [...prev, ...newEntries]);
        toast.info(`Đã tự động thêm ${newEntries.length} nhà đài còn thiếu từ ${sourceReference}.`);
    };

    // Auto-adjust quantities to match file requirements
    const handleAutoAdjustQuantities = () => {
        if (!fileStations.length) return;

        let adjustedCount = 0;
        setLines((prev) =>
            prev.map((line) => {
                if (line.isRemoved) return line;
                const fileSt = fileStations.find((fs) => fs.lotteryStationId === line.lotteryStationId);
                if (fileSt) {
                    const needed = fileSt.serialCount;
                    const minAllowed = line.totalQuantity + needed;
                    if (line.declareQuantity < minAllowed) {
                        adjustedCount++;
                        return { ...line, declareQuantity: minAllowed };
                    }
                }
                return line;
            })
        );

        if (adjustedCount > 0) {
            toast.info(`Đã tự động điều chỉnh số lượng cho ${adjustedCount} nhà đài theo ${sourceReference}.`);
        } else {
            toast.info('Số lượng khai báo của các nhà đài đã đủ để tiếp nhận vé.');
        }
    };

    // Remove line
    const handleRemoveLine = (tempKey: string) => {
        setLines((prev) =>
            prev
                .map((line) => {
                    if (line.tempKey !== tempKey) return line;
                    if (line.id) {
                        return { ...line, isRemoved: true };
                    }
                    return null;
                })
                .filter(Boolean) as EditableBatchLine[]
        );
    };

    // Update line field
    const handleUpdateLine = (tempKey: string, patch: Partial<EditableBatchLine>) => {
        setLines((prev) =>
            prev.map((line) => {
                if (line.tempKey !== tempKey) return line;
                const updated = { ...line, ...patch };

                if (patch.lotteryStationId && patch.lotteryStationId !== line.lotteryStationId) {
                    const st = stationById.get(patch.lotteryStationId);
                    if (st) {
                        updated.stationName = st.name;
                        updated.importCost =
                            computeImportCostFromStation(st.price, st.commissionRate) ?? 9500;
                    }
                }

                return updated;
            })
        );
    };

    // Calculate totals
    const totalDeclareQuantity = useMemo(
        () => activeLines.reduce((sum, l) => sum + (l.declareQuantity || 0), 0),
        [activeLines]
    );

    const totalCostValue = useMemo(
        () => activeLines.reduce((sum, l) => sum + (l.declareQuantity || 0) * (l.importCost || 0), 0),
        [activeLines]
    );
    const fileCoverageIssues = useMemo(
        () => getFileAllocationCoverageIssues(activeLines, fileStations, sourceLabel),
        [activeLines, fileStations, sourceLabel]
    );

    // Form validation
    const validationError = useMemo(() => {
        if (activeLines.length === 0) {
            return 'Phiếu nhập lô phải có ít nhất một nhà đài.';
        }
        for (const line of activeLines) {
            if (!line.lotteryStationId || line.lotteryStationId <= 0) {
                return 'Vui lòng chọn nhà đài cho tất cả các dòng.';
            }
            if (!line.declareQuantity || line.declareQuantity <= 0) {
                return `Nhà đài "${line.stationName || line.lotteryStationId}" phải có số lượng khai báo > 0.`;
            }
            if (line.declareQuantity < line.totalQuantity) {
                return `Nhà đài "${line.stationName}" đã nhập ${line.totalQuantity} vé. Số lượng khai báo không thể nhỏ hơn ${line.totalQuantity}.`;
            }
            if (line.importCost < 0) {
                return `Đơn giá vốn của đài "${line.stationName}" không hợp lệ.`;
            }
        }
        // Unique station check
        const stationSet = new Set<number>();
        for (const line of activeLines) {
            if (stationSet.has(line.lotteryStationId)) {
                return `Nhà đài "${line.stationName}" bị trùng lặp. Mỗi nhà đài chỉ được xuất hiện một dòng.`;
            }
            stationSet.add(line.lotteryStationId);
        }
        return null;
    }, [activeLines]);

    // Handle Save
    const handleSave = async () => {
        if (!batch) return;
        setSaveAttempted(true);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        if (fileCoverageIssues.length > 0) {
            toast.error(`Phiếu nhập lô chưa khớp ${sourceReference}: ${fileCoverageIssues[0]}`);
            return;
        }

        const payload: UpdateImportBatchPayload = {
            supplierId: batch.supplierId!,
            totalDeclareQuantity,
            lines: lines.map((l) => ({
                id: l.id,
                lotteryStationId: l.lotteryStationId,
                declareQuantity: l.declareQuantity,
                importCost: l.importCost,
                removed: l.isRemoved || undefined,
            })),
        };

        try {
            const res = await updateBatchAsync(payload);
            if (res.success) {
                toast.success(res.message || 'Cập nhật phân bổ số lượng nhà đài thành công.');
                await onBatchUpdated();
                onClose();
            } else {
                toast.error(res.message || 'Không thể cập nhật phiếu nhập.');
            }
        } catch (err: any) {
            const msg =
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi cập nhật phiếu nhập.';
            toast.error(msg);
        }
    };

    if (!batch) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
            <DialogTitle sx={{ pr: 6, pb: 1.5, pt: 2.5, px: 3, borderBottom: '1px solid #f1f5f9' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="h6" fontWeight={800} color="#0f172a">
                                Phân bổ số lượng nhập theo từng nhà đài
                            </Typography>
                            <Chip
                                size="small"
                                label={batch.batchCode ?? `#${batch.id}`}
                                sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontFamily: 'monospace' }}
                            />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            Kỳ quay: <b>{formatDate(batch.drawDate)}</b> · Nhà cung cấp:{' '}
                            <b>{batch.supplierName || '—'}</b>
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 14, top: 14 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                {/* File reconciliation hints */}
                {missingFileStations.length > 0 && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 2, borderRadius: '12px', alignItems: 'center' }}
                        action={
                            <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                startIcon={<AutoFixHighIcon />}
                                onClick={handleAutoAddMissingFromSchedule}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                            >
                                Thêm {missingFileStations.length} đài còn thiếu
                            </Button>
                        }
                    >
                        {sourceLabel} có <b>{missingFileStations.length} nhà đài</b> chưa có trên phiếu: {missingFileStations.map((s) => s.stationName).join(', ')}.
                    </Alert>
                )}
                {saveAttempted && (validationError || fileCoverageIssues.length > 0) && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
                        <Typography variant="body2" fontWeight={700}>
                            Chưa thể lưu phân bổ: phiếu nhập lô cần đủ nhà đài và chỗ nhận vé theo {sourceReference}.
                        </Typography>
                        {validationError && <Typography variant="body2">{validationError}</Typography>}
                        {fileCoverageIssues.map((issue) => (
                            <Typography key={issue} variant="body2">• {issue}</Typography>
                        ))}
                    </Alert>
                )}

                {/* Toolbar */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                    <Typography variant="subtitle2" fontWeight={700} color="#334155">
                        Danh sách nhà đài trên phiếu ({activeLines.length})
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        {fileStations.length > 0 && (
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<AutoFixHighIcon />}
                                onClick={handleAutoAdjustQuantities}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', fontSize: '0.8rem' }}
                            >
                                Khớp số lượng theo {sourceReference}
                            </Button>
                        )}
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddLine}
                            disabled={isLoadingStations}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '8px',
                                bgcolor: '#2563eb',
                                fontSize: '0.8rem',
                            }}
                        >
                            Thêm nhà đài
                        </Button>
                    </Stack>
                </Stack>

                {/* Allocation Table */}
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <Table size="small" sx={{ minWidth: 1120 }}>
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', minWidth: 170 }}>Nhà đài</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', width: 90 }}>Đã nhập</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', width: 130 }}>SL khai báo (vé) *</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', width: 110 }}>Giá vé</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', width: 100 }}>Hoa hồng</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', width: 130 }}>Đơn giá vốn</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', width: 130 }}>Thành tiền</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', width: 110 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {activeLines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#64748b' }}>
                                        Chưa có nhà đài nào. Nhấn <b>"Thêm nhà đài"</b> hoặc <b>"Thêm đài còn thiếu"</b> để bắt đầu.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeLines.map((line) => {
                                    const fileSt = fileStations.find((fs) => fs.lotteryStationId === line.lotteryStationId);
                                    const availableStations = eligibleStations.filter(
                                        (s) => s.lotteryStationId === line.lotteryStationId || !selectedStationIds.includes(s.lotteryStationId)
                                    );

                                    const lineTotalCost = (line.declareQuantity || 0) * (line.importCost || 0);
                                    const station = stationById.get(line.lotteryStationId);

                                    return (
                                        <TableRow key={line.tempKey} hover>
                                            {/* Station Selector */}
                                            <TableCell align="center">
                                                {line.isExisting ? (
                                                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                        {station?.name || line.stationName}
                                                    </Typography>
                                                ) : (
                                                    <FormControl size="small" fullWidth>
                                                        <Select
                                                            value={line.lotteryStationId || ''}
                                                            onChange={(e) =>
                                                                handleUpdateLine(line.tempKey, {
                                                                    lotteryStationId: Number(e.target.value),
                                                                })
                                                            }
                                                            displayEmpty
                                                            sx={{ borderRadius: '8px', fontSize: '0.85rem', '& .MuiSelect-select': { textAlign: 'center' } }}
                                                        >
                                                            <MenuItem value="" disabled>
                                                                <em>Chọn nhà đài</em>
                                                            </MenuItem>
                                                            {availableStations.map((st) => (
                                                                <MenuItem key={st.lotteryStationId} value={st.lotteryStationId}>
                                                                    {st.name}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                )}
                                                {fileSt && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                                        {sourceLabel} yêu cầu: <b>{fileSt.serialCount || fileSt.declaredQuantity} vé</b>
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            {/* Total Imported */}
                                            <TableCell align="center">
                                                <Typography variant="body2" color={line.totalQuantity > 0 ? 'primary.main' : 'text.secondary'} fontWeight={600}>
                                                    {line.totalQuantity}
                                                </Typography>
                                            </TableCell>

                                            {/* Declared Quantity Input */}
                                            <TableCell align="center">
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    value={line.declareQuantity || ''}
                                                    onWheel={preventNumberInputWheel}
                                                    onChange={(e) => {
                                                        const parsed = parseNonNegativeIntegerInput(e.target.value);
                                                        handleUpdateLine(line.tempKey, {
                                                            declareQuantity: parsed ?? 0,
                                                        });
                                                    }}
                                                    inputProps={{ min: line.totalQuantity, step: 1 }}
                                                    sx={{
                                                        width: 110,
                                                        '& .MuiOutlinedInput-input': { textAlign: 'center', fontWeight: 700 },
                                                    }}
                                                />
                                            </TableCell>

                                            <TableCell align="center">
                                                {station?.price != null ? formatVnd(station.price) : '—'}
                                            </TableCell>
                                            <TableCell align="center">
                                                {station?.commissionRate != null
                                                    ? `${(station.commissionRate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell align="center">
                                                {formatVnd(line.importCost)}
                                            </TableCell>

                                            {/* Total Line Cost */}
                                            <TableCell align="center">
                                                <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                    {formatVnd(lineTotalCost)}
                                                </Typography>
                                            </TableCell>

                                            {/* Remove Line */}
                                            <TableCell align="center">
                                                {line.lotteryStationId > 0 && (
                                                    <CanAccess permission={PERMISSIONS.PROVIDER.EDIT}>
                                                        <Tooltip title={`Chỉnh sửa nhà đài ${line.stationName || station?.name || ''}`}>
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                aria-label={`Chỉnh sửa nhà đài ${line.stationName || station?.name || ''}`}
                                                                onClick={() => router.push(ROUTES.ADMIN.TICKETS.PROVIDER_EDIT(line.lotteryStationId))}
                                                            >
                                                                <EditOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </CanAccess>
                                                )}
                                                {line.totalQuantity > 0 ? (
                                                    <Tooltip title="Đã có vé nhập, không thể xóa">
                                                        <span>
                                                            <IconButton size="small" disabled>
                                                                <DeleteOutlineIcon sx={{ fontSize: '1.1rem' }} />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="Xóa dòng">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleRemoveLine(line.tempKey)}
                                                        >
                                                            <DeleteOutlineIcon sx={{ fontSize: '1.1rem' }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Totals Summary Footer */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mt: 2,
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Typography variant="subtitle2" color="text.secondary">
                        Tổng số nhà đài: <b style={{ color: '#0f172a' }}>{activeLines.length} đài</b>
                    </Typography>
                    <Stack direction="row" spacing={3} alignItems="center">
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">
                                Tổng số lượng khai báo:
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="#2563eb">
                                {formatViInteger(totalDeclareQuantity)} vé
                            </Typography>
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">
                                Tổng giá trị dự kiến:
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                {formatImportCost(totalCostValue)} đ
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, px: 3, borderTop: '1px solid #f1f5f9' }}>
                <Button variant="outlined" onClick={onClose} disabled={isUpdating} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                    Hủy bỏ
                </Button>
                <Button
                    variant="contained"
                    onClick={() => void handleSave()}
                    disabled={isUpdating}
                    startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '8px',
                        bgcolor: '#2563eb',
                        '&:hover': { bgcolor: '#1d4ed8' },
                    }}
                >
                    {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
