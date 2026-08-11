"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Card, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Paper, Radio, RadioGroup, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Button } from '../../../../../components/ui/Button';
import { ROUTES } from '../../../../../constants/routes';
import { LazyReportSerialFaultPane } from '../../../import-batch/components/sections/LazyReportSerialFaultPane';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';
import type { CancelSelectedSerial } from '../../../import-batch/hooks/useCancelTicketSelection';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { isFaultyTicketCondition, normalizeSerialStatus } from '../../../import-batch/utils/serialIncidentWorkflow';
import {
    useConfirmReturnInspection,
    useInspectableReturnSerials,
    useReturnBatchDetail,
} from '../../hooks/useReturnBatch';
import type { InspectableReturnSerial, ReturnDeliveryMode } from '../../types/returnBatch.type';
import { RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE } from '../../types/returnBatch.type';

const showInspectionExpiredPopup = () =>
    Swal.fire({
        icon: 'warning',
        title: 'Inspection period expired',
        text: RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE,
        confirmButtonColor: '#1C252E',
        confirmButtonText: 'OK',
    });

const isReturnSelectableSerial = (serial: InspectableReturnSerial): boolean => {
    if (serial.status !== 'IN_STOCK') return false;
    if (isFaultyTicketCondition(serial.ticketCondition)) return false;
    return true;
};

const toCancelSelectedSerial = (serial: InspectableReturnSerial): CancelSelectedSerial => ({
    id: serial.serialId,
    serialNumber: serial.serialNumber,
    status: serial.status,
    ticketCondition: serial.ticketCondition,
    returnBatchLineId: undefined,
    ticketId: serial.ticketId,
    ticketNumbers: serial.ticketNumbers || undefined,
    importBatchLineId: serial.importBatchLineId ?? undefined,
});

const CollapsibleInspectTicketRow = ({
    ticketGroup,
    selectedSerialIds,
    onToggleGroup,
    onToggleSingle,
}: {
    ticketGroup: {
        ticketKey: string;
        lotteryStationName: string;
        ticketNumbers: string;
        ticketPrice: number;
        importCost: number;
        serials: any[];
    };
    selectedSerialIds: Set<number>;
    onToggleGroup: (groupSerials: any[], checked: boolean) => void;
    onToggleSingle: (sId: number) => void;
}) => {
    const [open, setOpen] = useState(false);

    const groupSerialIds = useMemo(() => ticketGroup.serials.map((s) => s.serialId), [ticketGroup.serials]);
    const selectedCountInGroup = useMemo(
        () => groupSerialIds.filter((sId) => selectedSerialIds.has(sId)).length,
        [groupSerialIds, selectedSerialIds]
    );

    const isGroupChecked = groupSerialIds.length > 0 && selectedCountInGroup === groupSerialIds.length;
    const isGroupIndeterminate = selectedCountInGroup > 0 && selectedCountInGroup < groupSerialIds.length;

    const firstSerial = ticketGroup.serials[0];
    const normalizedStatus = normalizeSerialStatus(firstSerial?.status);

    return (
        <React.Fragment>
            <TableRow
                hover
                sx={{
                    '& > *': { borderBottom: 'unset' },
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#F8FAFC' },
                    transition: 'background-color 0.15s ease',
                }}
                onClick={() => setOpen(!open)}
            >
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        size="small"
                        checked={isGroupChecked}
                        indeterminate={isGroupIndeterminate}
                        onChange={(e) => onToggleGroup(ticketGroup.serials, e.target.checked)}
                    />
                </TableCell>
                <TableCell sx={{ width: 40, py: 1.5 }}>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(!open);
                        }}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#0F172A', py: 1.5 }}>
                    {ticketGroup.lotteryStationName || '—'}
                </TableCell>
                <TableCell component="th" scope="row" sx={{ py: 1.5 }}>
                    <Typography
                        variant="body2"
                        fontWeight={800}
                        color="primary.main"
                        sx={{
                            letterSpacing: '0.5px',
                            fontFamily: 'monospace',
                        }}
                    >
                        {ticketGroup.ticketNumbers || '—'}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {ticketGroup.serials.length} sê-ri
                    </Typography>
                </TableCell>
                <TableCell align="center" sx={{ py: 1.5 }}>
                    <Chip
                        label={normalizedStatus === 'IN_STOCK' ? 'Trong kho' : firstSerial?.status || 'Trong kho'}
                        size="small"
                        color={normalizedStatus === 'IN_STOCK' ? 'success' : 'warning'}
                        variant={normalizedStatus === 'IN_STOCK' ? 'outlined' : 'filled'}
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                    />
                </TableCell>
                <TableCell align="center" sx={{ py: 1.5 }}>
                    <Chip
                        label={firstSerial?.ticketCondition === 'GOOD' ? 'Tốt' : firstSerial?.ticketCondition || 'Tốt'}
                        size="small"
                        variant="outlined"
                        color={firstSerial?.ticketCondition === 'GOOD' ? 'success' : 'warning'}
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                    />
                </TableCell>
                <TableCell align="right" sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        {formatImportCost(ticketGroup.ticketPrice)} VNĐ
                    </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} color="#0F172A">
                        {formatImportCost(ticketGroup.importCost)} VNĐ
                    </Typography>
                </TableCell>
            </TableRow>

            {open &&
                ticketGroup.serials.map((s: any) => {
                    const isChecked = selectedSerialIds.has(s.serialId);
                    const normStat = normalizeSerialStatus(s.status);

                    return (
                        <TableRow
                            key={s.serialId}
                            hover
                            selected={isChecked}
                            onClick={() => onToggleSingle(s.serialId)}
                            sx={{
                                bgcolor: '#F8FAFC',
                                '&:hover': { bgcolor: '#F1F5F9' },
                                transition: 'background-color 0.15s ease',
                                cursor: 'pointer',
                            }}
                        >
                            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    size="small"
                                    checked={isChecked}
                                    onChange={() => onToggleSingle(s.serialId)}
                                />
                            </TableCell>
                            <TableCell sx={{ width: 40, py: 1 }} />
                            <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {s.lotteryStationName || ticketGroup.lotteryStationName || '—'}
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" fontWeight={600} color="text.secondary">
                                    {ticketGroup.ticketNumbers}
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                                <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{
                                        fontFamily: 'monospace',
                                        bgcolor: '#FFFFFF',
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 1,
                                        display: 'inline-block',
                                        border: '1px solid #E2E8F0',
                                        color: '#334155',
                                    }}
                                >
                                    {s.serialNumber}
                                </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                                <Chip
                                    label={normStat === 'IN_STOCK' ? 'Trong kho' : s.status || 'Trong kho'}
                                    size="small"
                                    color={normStat === 'IN_STOCK' ? 'success' : 'warning'}
                                    variant={normStat === 'IN_STOCK' ? 'outlined' : 'filled'}
                                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                                <Chip
                                    label={s.ticketCondition === 'GOOD' ? 'Tốt' : s.ticketCondition || 'Tốt'}
                                    size="small"
                                    variant="outlined"
                                    color={s.ticketCondition === 'GOOD' ? 'success' : 'warning'}
                                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                    {formatImportCost(s.ticketPrice ?? ticketGroup.ticketPrice)} VNĐ
                                </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>
                                <Typography variant="body2" fontWeight={600} color="#0F172A">
                                    {formatImportCost(s.importCost ?? ticketGroup.importCost)} VNĐ
                                </Typography>
                            </TableCell>
                        </TableRow>
                    );
                })}
        </React.Fragment>
    );
};

export const ReturnBatchInspectPage = () => {
    const router = useAdminRouter();
    const { id } = useRouteParams();
    const batchId = id ? String(id) : '';

    const { data: batch, isLoading: isBatchLoading } = useReturnBatchDetail(batchId);
    const { data: serials = [], isLoading: isSerialsLoading, refetch } = useInspectableReturnSerials(batchId, true);
    const confirmInspection = useConfirmReturnInspection();

    const inspectionExpired = Boolean(batch?.inspectionExpired || batch?.status === 'CANCELLED');
    const mutationsBlocked = inspectionExpired;

    const [deliveryMode, setDeliveryMode] = useState<ReturnDeliveryMode>('RETAILER_DELIVERS');
    const [selectedSerialIds, setSelectedSerialIds] = useState<Set<number>>(new Set());
    const [activeStep, setActiveStep] = useState<'INSPECT' | 'REPORT'>('INSPECT');
    const [selectedStationTab, setSelectedStationTab] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showStationDetails, setShowStationDetails] = useState<boolean>(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [note, setNote] = useState<string>('');
    const [returnEvidenceUrl, setReturnEvidenceUrl] = useState<string>('');

    const inStockSerials = useMemo(
        () => serials.filter(isReturnSelectableSerial),
        [serials]
    );

    useEffect(() => {
        const validIds = new Set(inStockSerials.map((s) => s.serialId));
        setSelectedSerialIds((prev) => {
            const next = new Set([...prev].filter((validId) => validIds.has(validId)));
            return next.size === prev.size ? prev : next;
        });
    }, [inStockSerials]);

    const inStockCount = inStockSerials.length;
    const inStockValue = useMemo(
        () => inStockSerials.reduce((sum, s) => sum + Number(s.importCost || 0), 0),
        [inStockSerials]
    );

    const stationNames = useMemo(() => {
        const names = new Set<string>();
        inStockSerials.forEach((s) => {
            if (s.lotteryStationName) names.add(s.lotteryStationName);
        });
        return Array.from(names);
    }, [inStockSerials]);

    const stationSummaries = useMemo(() => {
        const map = new Map<string, { count: number; totalCost: number; totalPrice: number }>();
        inStockSerials.forEach((s) => {
            const station = s.lotteryStationName || 'Không xác định';
            const cost = Number(s.importCost || 0);
            const price = Number(s.ticketPrice ?? 10000);
            const current = map.get(station) || { count: 0, totalCost: 0, totalPrice: 0 };
            map.set(station, {
                count: current.count + 1,
                totalCost: current.totalCost + cost,
                totalPrice: current.totalPrice + price,
            });
        });
        return Array.from(map.entries()).map(([stationName, stats]) => ({
            stationName,
            ...stats,
        }));
    }, [inStockSerials]);

    const displaySerials = useMemo(() => {
        let result = inStockSerials;
        if (selectedStationTab !== 'ALL') {
            result = result.filter((s) => s.lotteryStationName === selectedStationTab);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(
                (s) =>
                    (s.serialNumber && s.serialNumber.toLowerCase().includes(q)) ||
                    (s.ticketNumbers && s.ticketNumbers.toLowerCase().includes(q)) ||
                    (s.lotteryStationName && s.lotteryStationName.toLowerCase().includes(q))
            );
        }
        return result;
    }, [inStockSerials, selectedStationTab, searchQuery]);

    const displayTickets = useMemo(() => {
        const groupMap = new Map<
            string,
            {
                ticketKey: string;
                lotteryStationName: string;
                ticketNumbers: string;
                ticketPrice: number;
                importCost: number;
                serials: typeof displaySerials;
            }
        >();

        displaySerials.forEach((item) => {
            const key = `${item.lotteryStationName || '—'}_${item.ticketNumbers || '—'}`;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    ticketKey: key,
                    lotteryStationName: item.lotteryStationName || '—',
                    ticketNumbers: item.ticketNumbers || '—',
                    ticketPrice: Number(item.ticketPrice) || 10000,
                    importCost: Number(item.importCost) || 10000,
                    serials: [],
                });
            }
            groupMap.get(key)!.serials.push(item);
        });

        return Array.from(groupMap.values());
    }, [displaySerials]);

    const handleToggleGroup = (groupSerials: any[], checked: boolean) => {
        setSelectedSerialIds((prev) => {
            const next = new Set(prev);
            groupSerials.forEach((s) => {
                if (checked) {
                    next.add(s.serialId);
                } else {
                    next.delete(s.serialId);
                }
            });
            return next;
        });
    };

    const displaySelectableIds = useMemo(
        () => displaySerials.map((s) => s.serialId),
        [displaySerials]
    );

    const selectedOnPageCount = useMemo(
        () => displaySelectableIds.filter((sId) => selectedSerialIds.has(sId)).length,
        [displaySelectableIds, selectedSerialIds]
    );

    const allDisplaySelected =
        displaySelectableIds.length > 0 && selectedOnPageCount === displaySelectableIds.length;
    const someDisplaySelected =
        selectedOnPageCount > 0 && selectedOnPageCount < displaySelectableIds.length;

    const selectedSerialsForReport = useMemo((): CancelSelectedSerial[] => {
        return inStockSerials
            .filter((s) => selectedSerialIds.has(s.serialId))
            .map(toCancelSelectedSerial);
    }, [inStockSerials, selectedSerialIds]);

    const reportDialogProps = useMemo(() => {
        const first = selectedSerialsForReport[0];
        return {
            ticketNumbers: first?.ticketNumbers || '',
            ticketId: first?.ticketId,
            importBatchLineId: first?.importBatchLineId || 0,
            stationId: inStockSerials.find((s) => s.serialId === first?.id)?.lotteryStationId ?? undefined,
            drawDate: inStockSerials.find((s) => s.serialId === first?.id)?.drawDate || undefined,
        };
    }, [selectedSerialsForReport, inStockSerials]);

    const handleToggleSelectAllDisplay = (checked: boolean) => {
        setSelectedSerialIds((prev) => {
            const next = new Set(prev);
            if (checked) {
                displaySelectableIds.forEach((sId) => next.add(sId));
            } else {
                displaySelectableIds.forEach((sId) => next.delete(sId));
            }
            return next;
        });
    };

    const handleToggleSingle = (sId: number) => {
        setSelectedSerialIds((prev) => {
            const next = new Set(prev);
            if (next.has(sId)) {
                next.delete(sId);
            } else {
                next.add(sId);
            }
            return next;
        });
    };

    const handleReportSuccess = () => {
        refetch();
        setSelectedSerialIds(new Set());
        setActiveStep('INSPECT');
    };

    const executeConfirmSubmit = async () => {
        try {
            await confirmInspection.mutateAsync({
                id: Number(batchId),
                payload: {
                    deliveryMode,
                    serialIds: inStockSerials.map((s) => s.serialId),
                    returnReceiptUrl: returnEvidenceUrl.trim() || null,
                    returnEvidenceUrl: returnEvidenceUrl.trim() || null,
                    note: note.trim() || null,
                },
            });
            toast.success('Đã xác nhận kiểm tra vé — phiếu hoàn tất kiểm tra.');
            router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batchId));
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Không thể hoàn tất kiểm tra vé.';
            if (
                msg === RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE ||
                err?.response?.data?.errorCode === 'LT_120'
            ) {
                showInspectionExpiredPopup();
                refetch();
                return;
            }
            toast.error(msg);
        }
    };

    const handleConfirmInspectionSubmit = () => {
        if (mutationsBlocked) {
            showInspectionExpiredPopup();
            return;
        }
        if (inStockCount === 0) {
            toast.error('Không có sê-ri vé kho nào đủ điều kiện để trả.');
            return;
        }

        setIsConfirmModalOpen(true);
    };

    const handleExecuteConfirmFromModal = async () => {
        await executeConfirmSubmit();
        setIsConfirmModalOpen(false);
    };

    const handleBackToDetail = () => {
        router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batchId));
    };

    const isLoading = isBatchLoading || isSerialsLoading;

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            {/* Page Header with Circular Back Button */}
            <PageHeader
                title="Kiểm tra vé trả NCC"
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Trả vé NCC', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                    {
                        label: batch?.batchCode ? `Phiếu #${batch.batchCode}` : `Phiếu #${batchId}`,
                        to: ROUTES.ADMIN.RETURN_BATCH.DETAIL(batchId),
                    },
                    { label: 'Kiểm tra vé' },
                ]}
                titleExtra={
                    <IconButton
                        onClick={handleBackToDetail}
                        size="small"
                        sx={{
                            bgcolor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
                            width: 34,
                            height: 34,
                            '&:hover': {
                                bgcolor: '#f1f5f9',
                                borderColor: '#94a3b8',
                                color: '#0f172a',
                                transform: 'translateX(-2px)',
                            },
                            transition: 'all 0.15s ease',
                        }}
                        title="Quay lại chi tiết phiếu trả vé"
                    >
                        <ArrowBackOutlinedIcon fontSize="small" />
                    </IconButton>
                }
            />

            <Card
                elevation={0}
                sx={{
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                    bgcolor: '#FFFFFF',
                    boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.05)',
                }}
            >
                <Box sx={{ p: 3 }}>
                    {mutationsBlocked && activeStep === 'INSPECT' && (
                        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '10px' }}>
                            {RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE}
                        </Alert>
                    )}

                    {activeStep === 'REPORT' && (
                        <LazyReportSerialFaultPane
                            serials={selectedSerialsForReport}
                            ticketNumbers={reportDialogProps.ticketNumbers}
                            ticketId={reportDialogProps.ticketId}
                            importBatchLineId={reportDialogProps.importBatchLineId}
                            stationId={reportDialogProps.stationId}
                            drawDate={reportDialogProps.drawDate}
                            defaultCancelMode="TICKET"
                            cancelButtonText="Quay lại Kiểm tra vé trả NCC"
                            hideFaultedBySelector={true}
                            beforeConfirm={() => {
                                if (mutationsBlocked) {
                                    showInspectionExpiredPopup();
                                    return false;
                                }
                                return true;
                            }}
                            onCancel={() => setActiveStep('INSPECT')}
                            onSuccess={handleReportSuccess}
                        />
                    )}

                    {activeStep === 'INSPECT' && (
                        <Stack spacing={3}>
                            {/* Step 1: Hình thức giao trả */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    bgcolor: '#FAFAFA',
                                    borderRadius: '12px',
                                    border: '1px solid #E5E7EB',
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={700} color="#111827" sx={{ mb: 1.5 }}>
                                    Hình thức giao trả <span style={{ color: '#EF4444' }}>*</span>
                                </Typography>
                                <RadioGroup
                                    value={deliveryMode}
                                    onChange={(e) => setDeliveryMode(e.target.value as ReturnDeliveryMode)}
                                >
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <Box
                                            onClick={() => setDeliveryMode('RETAILER_DELIVERS')}
                                            sx={{
                                                flex: 1,
                                                p: 2,
                                                borderRadius: '10px',
                                                border: '1.5px solid',
                                                borderColor:
                                                    deliveryMode === 'RETAILER_DELIVERS' ? '#10B981' : '#E5E7EB',
                                                bgcolor:
                                                    deliveryMode === 'RETAILER_DELIVERS' ? '#ECFDF5' : '#FFFFFF',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                                <Radio
                                                    checked={deliveryMode === 'RETAILER_DELIVERS'}
                                                    size="small"
                                                    sx={{
                                                        p: 0,
                                                        mt: 0.2,
                                                        color: '#10B981',
                                                        '&.Mui-checked': { color: '#10B981' },
                                                    }}
                                                />
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700} color="#065F46">
                                                        Mang trả NCC (Chờ giao vé → Đã trả)
                                                    </Typography>
                                                    <Typography variant="caption" color="#047857" sx={{ display: 'block', mt: 0.25 }}>
                                                        Đại lý tự vận chuyển vé đến giao trực tiếp cho đại lý/nhà cung cấp
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Box>

                                        <Box
                                            onClick={() => setDeliveryMode('SUPPLIER_COLLECTS')}
                                            sx={{
                                                flex: 1,
                                                p: 2,
                                                borderRadius: '10px',
                                                border: '1.5px solid',
                                                borderColor:
                                                    deliveryMode === 'SUPPLIER_COLLECTS' ? '#10B981' : '#E5E7EB',
                                                bgcolor:
                                                    deliveryMode === 'SUPPLIER_COLLECTS' ? '#ECFDF5' : '#FFFFFF',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                                <Radio
                                                    checked={deliveryMode === 'SUPPLIER_COLLECTS'}
                                                    size="small"
                                                    sx={{
                                                        p: 0,
                                                        mt: 0.2,
                                                        color: '#10B981',
                                                        '&.Mui-checked': { color: '#10B981' },
                                                    }}
                                                />
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700} color="#065F46">
                                                        NCC đến lấy (Chờ giao vé → Đã trả)
                                                    </Typography>
                                                    <Typography variant="caption" color="#047857" sx={{ display: 'block', mt: 0.25 }}>
                                                        Đại diện nhà cung cấp đến nhận trực tiếp tại cửa hàng
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </RadioGroup>
                            </Paper>

                            {/* Step 2: Thống kê vé trong kho đủ điều kiện trả */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    bgcolor: '#F8FAFC',
                                    borderRadius: '12px',
                                    border: '1px solid #E2E8F0',
                                }}
                            >
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    justifyContent="space-between"
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    spacing={1.5}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Chip
                                            label={`${inStockCount} vé kho`}
                                            color="primary"
                                            size="small"
                                            sx={{ fontWeight: 700, borderRadius: '6px' }}
                                        />
                                        <Typography variant="body2" fontWeight={600} color="#334155">
                                            đủ điều kiện trả cho nhà cung cấp
                                        </Typography>
                                    </Stack>

                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Typography variant="body2" color="text.secondary">
                                            Tổng giá trị vốn ước tính:{' '}
                                            <strong style={{ color: '#0F172A' }}>
                                                {formatImportCost(inStockValue)} VNĐ
                                            </strong>
                                        </Typography>

                                        {stationSummaries.length > 0 && (
                                            <Button
                                                size="small"
                                                onClick={() => setShowStationDetails((prev) => !prev)}
                                                endIcon={
                                                    showStationDetails ? (
                                                        <KeyboardArrowUpIcon fontSize="small" />
                                                    ) : (
                                                        <KeyboardArrowDownIcon fontSize="small" />
                                                    )
                                                }
                                                sx={{ textTransform: 'none', fontWeight: 600, color: '#2563EB' }}
                                            >
                                                {showStationDetails ? 'Thu gọn chi tiết' : 'Xem chi tiết đài'}
                                            </Button>
                                        )}
                                    </Stack>
                                </Stack>

                                <Collapse in={showStationDetails} timeout="auto" unmountOnExit>
                                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px border-dashed #CBD5E1' }}>
                                        <Stack spacing={1.5}>
                                            {stationSummaries.map((summary) => (
                                                <Box
                                                    key={summary.stationName}
                                                    sx={{
                                                        p: 1.5,
                                                        borderRadius: '8px',
                                                        bgcolor: '#FFFFFF',
                                                        border: '1px solid #E2E8F0',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight={700} color="#0F172A">
                                                            {summary.stationName}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Tổng giá vốn:{' '}
                                                            <strong style={{ color: '#0F172A' }}>
                                                                {formatImportCost(summary.totalCost)} VNĐ
                                                            </strong>
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label={`${summary.count} vé`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: '#EFF6FF',
                                                            color: '#1D4ED8',
                                                            fontWeight: 700,
                                                            fontSize: '0.75rem',
                                                        }}
                                                    />
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Collapse>
                            </Paper>

                            {/* Step 3: Bộ lọc & Bảng danh sách sê-ri vé kho */}
                            <Box>
                                <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    justifyContent="space-between"
                                    alignItems={{ xs: 'stretch', md: 'center' }}
                                    spacing={2}
                                    sx={{ mb: 2 }}
                                >
                                    <Tabs
                                        value={selectedStationTab}
                                        onChange={(_, newVal) => setSelectedStationTab(newVal)}
                                        variant="scrollable"
                                        scrollButtons="auto"
                                        sx={{
                                            minHeight: 38,
                                            '& .MuiTab-root': {
                                                minHeight: 38,
                                                py: 0.5,
                                                px: 2,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                            },
                                        }}
                                    >
                                        <Tab label={`Tất cả (${inStockCount})`} value="ALL" />
                                        {stationNames.map((name) => {
                                            const count = inStockSerials.filter((s) => s.lotteryStationName === name).length;
                                            return <Tab key={name} label={`${name} (${count})`} value={name} />;
                                        })}
                                    </Tabs>

                                    <TextField
                                        size="small"
                                        placeholder="Tìm mã sê-ri, số vé, nhà đài..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon fontSize="small" sx={{ color: '#94A3B8' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ minWidth: { xs: '100%', md: 280 } }}
                                    />
                                </Stack>

                                {/* Action bar cho các dòng đã chọn */}
                                {selectedSerialIds.size > 0 && (
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.5,
                                            mb: 2,
                                            bgcolor: '#FEF2F2',
                                            border: '1px solid #FECACA',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={600} color="#991B1B">
                                            Đã chọn <strong>{selectedSerialIds.size}</strong> sê-ri vé kho
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            startIcon={<ReportProblemIcon fontSize="small" />}
                                            onClick={() => setActiveStep('REPORT')}
                                            disabled={mutationsBlocked}
                                            sx={{ textTransform: 'none', fontWeight: 700 }}
                                        >
                                            Báo hỏng / Sự cố sê-ri đã chọn
                                        </Button>
                                    </Paper>
                                )}

                                {/* Bảng danh sách sê-ri */}
                                <TableContainer
                                    component={Paper}
                                    elevation={0}
                                    sx={{
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '10px',
                                        maxHeight: 440,
                                    }}
                                >
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700 } }}>
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        size="small"
                                                        indeterminate={someDisplaySelected}
                                                        checked={allDisplaySelected}
                                                        onChange={(e) => handleToggleSelectAllDisplay(e.target.checked)}
                                                        disabled={displaySelectableIds.length === 0}
                                                    />
                                                </TableCell>
                                                <TableCell width={40} />
                                                <TableCell>Nhà đài</TableCell>
                                                <TableCell>Số vé</TableCell>
                                                <TableCell>Sê-ri</TableCell>
                                                <TableCell align="center">Trạng thái</TableCell>
                                                <TableCell align="center">Tình trạng vé</TableCell>
                                                <TableCell align="right">Giá bán</TableCell>
                                                <TableCell align="right">Giá vốn</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {displayTickets.map((ticketGroup) => (
                                                <CollapsibleInspectTicketRow
                                                    key={ticketGroup.ticketKey}
                                                    ticketGroup={ticketGroup}
                                                    selectedSerialIds={selectedSerialIds}
                                                    onToggleGroup={handleToggleGroup}
                                                    onToggleSingle={handleToggleSingle}
                                                />
                                            ))}

                                            {displaySerials.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                                        <Typography color="text.secondary">
                                                            {searchQuery
                                                                ? 'Không tìm thấy sê-ri khớp từ khóa.'
                                                                : 'Không có sê-ri kho đủ điều kiện trong danh sách.'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Stack>
                    )}
                </Box>

                {/* Footer buttons */}
                {activeStep === 'INSPECT' && (
                    <Box
                        sx={{
                            p: 2.5,
                            bgcolor: '#FAFBFC',
                            borderTop: '1px solid #E5E7EB',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 1.5,
                        }}
                    >
                        <Button
                            variant="outlined"
                            onClick={handleBackToDetail}
                            sx={{
                                color: '#374151',
                                borderColor: '#D1D5DB',
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 3,
                                '&:hover': { borderColor: '#9CA3AF', bgcolor: '#F3F4F6' },
                            }}
                        >
                            Đóng / Quay lại
                        </Button>

                        <Button
                            variant="contained"
                            loading={confirmInspection.isPending}
                            onClick={handleConfirmInspectionSubmit}
                            disabled={mutationsBlocked || inStockCount === 0}
                            label="Xác nhận kiểm tra"
                            sx={{
                                bgcolor: '#0F172A',
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 3,
                                '&:hover': { bgcolor: '#1E293B' },
                            }}
                        />
                    </Box>
                )}
            </Card>

            {/* Confirmation Modal Pop-up */}
            <Dialog
                open={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: '16px', overflow: 'hidden' },
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2.5,
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        color: '#fff',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <ConfirmationNumberIcon sx={{ color: 'primary.light' }} />
                        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
                            Xác nhận kiểm tra vé trả NCC
                        </Typography>
                    </Stack>
                    <IconButton
                        onClick={() => setIsConfirmModalOpen(false)}
                        size="small"
                        sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 3, bgcolor: '#FFFFFF' }}>
                    <Stack spacing={2.5}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.925rem', lineHeight: 1.6 }}>
                            Bạn có chắc chắn muốn hoàn tất rà soát và xác nhận kiểm tra{' '}
                            <Typography component="span" fontWeight={700} color="primary.main">
                                {inStockCount} vé
                            </Typography>{' '}
                            đủ điều kiện trả cho nhà cung cấp?
                        </Typography>

                        {/* Summary Box */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: '#F8FAFC',
                                borderColor: '#E2E8F0',
                            }}
                        >
                            <Stack spacing={1.2}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" pb={1} borderBottom="1px solid #E2E8F0">
                                    <Typography variant="body2" color="text.secondary">
                                        Hình thức giao trả:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600} color="#0F172A">
                                        {deliveryMode === 'RETAILER_DELIVERS'
                                            ? 'Mang trả NCC (Đại lý tự vận chuyển giao)'
                                            : 'NCC đến lấy (Đại diện NCC nhận tại cửa hàng)'}
                                    </Typography>
                                </Box>

                                <Box display="flex" justifyContent="space-between" alignItems="center" pb={1} borderBottom="1px solid #E2E8F0">
                                    <Typography variant="body2" color="text.secondary">
                                        Tổng số lượng vé:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0284C7">
                                        {inStockCount} vé
                                    </Typography>
                                </Box>

                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">
                                        Tổng giá trị vốn ước tính:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} color="#FF3030" sx={{ fontSize: '0.95rem' }}>
                                        {formatImportCost(inStockValue)} VNĐ
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>

                        {/* Station Summary Breakdown Table */}
                        {stationSummaries.length > 0 && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    borderColor: '#E2E8F0',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color="#1E293B"
                                    sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}
                                >
                                    Chi tiết số lượng theo từng nhà đài
                                </Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 } }}>
                                            <TableCell sx={{ py: 1, pl: 0 }}>Nhà đài</TableCell>
                                            <TableCell align="center" sx={{ py: 1 }}>Số lượng</TableCell>
                                            <TableCell align="right" sx={{ py: 1, pr: 0 }}>Giá trị vốn</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stationSummaries.map((st) => (
                                            <TableRow key={st.stationName} sx={{ '& td': { borderBottom: '1px solid #F1F5F9' } }}>
                                                <TableCell sx={{ py: 1, pl: 0, fontWeight: 600, color: '#334155' }}>
                                                    {st.stationName}
                                                </TableCell>
                                                <TableCell align="center" sx={{ py: 1, color: '#0284C7', fontWeight: 600 }}>
                                                    {st.count} vé
                                                </TableCell>
                                                <TableCell align="right" sx={{ py: 1, pr: 0, fontWeight: 700, color: '#FF3030' }}>
                                                    {formatImportCost(st.totalCost)} VNĐ
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Paper>
                        )}

                        {/* Additional Info: Note & Return Evidence Image */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                borderColor: '#E2E8F0',
                                bgcolor: '#FFFFFF',
                            }}
                        >
                            <Typography
                                variant="caption"
                                fontWeight={700}
                                color="#1E293B"
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}
                            >
                                Thông tin bổ sung
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    label="Ghi chú kiểm tra"
                                    placeholder="Nhập ghi chú hoặc thông tin bổ sung cho đợt kiểm tra vé..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    multiline
                                    rows={2}
                                    fullWidth
                                    size="small"
                                />

                                <Box>
                                    <Typography variant="body2" fontWeight={600} color="#334155" sx={{ mb: 1 }}>
                                        Bằng chứng trả vé (Hình ảnh / Biên nhận)
                                    </Typography>
                                    <UploadSingleFile
                                        value={returnEvidenceUrl}
                                        onChange={(url) => setReturnEvidenceUrl(url || '')}
                                        label="Tải lên ảnh bằng chứng trả vé"
                                        autoUpload
                                    />
                                    {returnEvidenceUrl && (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Đường dẫn ảnh bằng chứng (returnEvidenceUrl)"
                                            value={returnEvidenceUrl}
                                            onChange={(e) => setReturnEvidenceUrl(e.target.value)}
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                </Box>
                            </Stack>
                        </Paper>

                        {/* Warning Note */}
                        <Alert
                            severity="warning"
                            sx={{
                                borderRadius: '10px',
                                bgcolor: '#FEF3C7',
                                color: '#78350F',
                                border: '1px solid #FDE68A',
                                '& .MuiAlert-icon': { color: '#D97706' },
                            }}
                        >
                            <strong>Lưu ý:</strong> Sau khi xác nhận, toàn bộ sê-ri vé kho trên sẽ được chuyển sang trạng thái sẵn sàng bàn giao cho NCC.
                        </Alert>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 2.5, py: 2, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                    <Button
                        variant="outlined"
                        onClick={() => setIsConfirmModalOpen(false)}
                        sx={{
                            color: '#475569',
                            borderColor: '#CBD5E1',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2.5,
                            '&:hover': { bgcolor: '#F1F5F9', borderColor: '#94A3B8' },
                        }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="contained"
                        loading={confirmInspection.isPending}
                        onClick={handleExecuteConfirmFromModal}
                        label="Xác nhận kiểm tra"
                        sx={{
                            bgcolor: '#0F172A',
                            textTransform: 'none',
                            fontWeight: 700,
                            px: 3,
                            '&:hover': { bgcolor: '#1E293B' },
                        }}
                    />
                </DialogActions>
            </Dialog>
        </Box>
    );
};
