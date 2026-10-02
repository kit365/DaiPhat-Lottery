"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Card, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Button } from '../../../../../components/ui/Button';
import { ROUTES } from '../../../../../constants/routes';
import { LazyReportSerialFaultPane } from '../../../import-batch/components/sections/LazyReportSerialFaultPane';
import type { CancelSelectedSerial } from '../../../import-batch/hooks/useCancelTicketSelection';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { isSerialIncidentEligible, normalizeSerialStatus } from '../../../import-batch/utils/serialIncidentWorkflow';
import {
    useConfirmReturnInspection,
    useInspectableReturnTickets,
    useReturnBatchDetail,
} from '../../hooks/useReturnBatch';
import type { InspectableReturnSerial, InspectableReturnTicket, ReturnDeliveryMode } from '../../types/returnBatch.type';
import { RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE } from '../../types/returnBatch.type';
import { getInspectableTicketConditionLabel, isReturnSelectableSerial } from '../../utils/returnInspectableSerial';

const showInspectionExpiredPopup = () =>
    Swal.fire({
        icon: 'warning',
        title: 'Inspection period expired',
        text: RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE,
        confirmButtonColor: '#1C252E',
        confirmButtonText: 'OK',
    });

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
        serials: InspectableReturnSerial[];
    };
    selectedSerialIds: Set<number>;
    onToggleGroup: (groupSerials: InspectableReturnSerial[], checked: boolean) => void;
    onToggleSingle: (serial: InspectableReturnSerial) => void;
}) => {
    const [open, setOpen] = useState(false);

    const reportableSerials = useMemo(
        () => ticketGroup.serials.filter((serial) => isSerialIncidentEligible(serial)),
        [ticketGroup.serials]
    );
    const groupSerialIds = useMemo(() => reportableSerials.map((s) => s.serialId), [reportableSerials]);
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
                        onChange={(e) => onToggleGroup(reportableSerials, e.target.checked)}
                        disabled={reportableSerials.length === 0}
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
                        label={getInspectableTicketConditionLabel(firstSerial)}
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
            </TableRow>

            {open &&
                ticketGroup.serials.map((s: any) => {
                    const isChecked = selectedSerialIds.has(s.serialId);
                    const normStat = normalizeSerialStatus(s.status);
                    const incidentEligible = isSerialIncidentEligible(s);

                    return (
                        <TableRow
                            key={s.serialId}
                            hover
                            selected={isChecked}
                            onClick={() => incidentEligible && onToggleSingle(s)}
                            sx={{
                                bgcolor: '#F8FAFC',
                                '&:hover': { bgcolor: '#F1F5F9' },
                                transition: 'background-color 0.15s ease',
                                cursor: 'pointer',
                                opacity: incidentEligible ? 1 : 0.72,
                            }}
                        >
                            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                <Tooltip title={incidentEligible ? '' : 'Sê-ri này được phép trả NCC nhưng không được phép báo sự cố.'}>
                                    <span>
                                        <Checkbox
                                            size="small"
                                            checked={isChecked}
                                            disabled={!incidentEligible}
                                            onChange={() => onToggleSingle(s)}
                                        />
                                    </span>
                                </Tooltip>
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
                                    label={getInspectableTicketConditionLabel(s)}
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

    const { data: batch, isLoading: isBatchLoading, refetch: refetchBatch } = useReturnBatchDetail(batchId);
    const confirmInspection = useConfirmReturnInspection();

    const inspectionExpired = Boolean(batch?.inspectionExpired || batch?.status === 'CANCELLED');
    const inspectionNotOpen = Boolean(batch && !inspectionExpired && batch.inInspectionWindow === false);
    const mutationsBlocked = inspectionExpired || inspectionNotOpen;

    useEffect(() => {
        if (!batch || isBatchLoading) {
            return;
        }
        if (inspectionExpired) {
            toast.warning('Đã quá hạn trả vé. Chỉ có thể xem chi tiết phiếu trả.');
            router.replace(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id));
            return;
        }
        if (inspectionNotOpen) {
            toast.info('Chưa đến giờ chuẩn bị/kiểm tra vé trả.');
            router.replace(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id));
        }
    }, [batch, isBatchLoading, inspectionExpired, inspectionNotOpen, router]);

    const [deliveryMode, setDeliveryMode] = useState<ReturnDeliveryMode>('RETAILER_DELIVERS');
    const [selectedSerialIds, setSelectedSerialIds] = useState<Set<number>>(new Set());
    const [selectedSerialCache, setSelectedSerialCache] = useState<Map<number, InspectableReturnSerial>>(new Map());
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [isCancelReportConfirmOpen, setIsCancelReportConfirmOpen] = useState(false);
    const [selectedStationId, setSelectedStationId] = useState<number | ''>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showStationDetails, setShowStationDetails] = useState<boolean>(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
            setPage(0);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [searchQuery]);

    const inspectableParams = useMemo(
        () => ({
            page: page + 1,
            size: rowsPerPage,
            search: debouncedSearch || undefined,
            lotteryStationId: selectedStationId || undefined,
        }),
        [page, rowsPerPage, debouncedSearch, selectedStationId]
    );
    const {
        data: inspectableData,
        isLoading: isSerialsLoading,
        isFetching: isSerialsFetching,
        refetch,
    } = useInspectableReturnTickets(batchId, inspectableParams, true);

    const displayTickets = useMemo(
        () => (inspectableData?.recordList ?? []).map((ticket: InspectableReturnTicket) => ({
            ticketKey: String(ticket.ticketId),
            lotteryStationName: ticket.lotteryStationName || '—',
            ticketNumbers: ticket.ticketNumbers || '—',
            ticketPrice: Number(ticket.ticketPrice) || 10000,
            serials: (ticket.serials || []).filter(isReturnSelectableSerial),
        })),
        [inspectableData?.recordList]
    );
    const displaySerials = useMemo(
        () => displayTickets.flatMap((ticket) => ticket.serials),
        [displayTickets]
    );
    const inStockCount = Number(inspectableData?.eligibleSerialCount || 0);
    const inStockValue = Number(inspectableData?.eligibleReturnValue || 0);
    const pagination = inspectableData?.pagination;
    const stationSummaries = inspectableData?.stationSummaries ?? [];

    useEffect(() => {
        if (pagination && pagination.totalPages > 0 && page >= pagination.totalPages) {
            setPage(Math.max(0, pagination.totalPages - 1));
        }
    }, [page, pagination]);

    const handleToggleGroup = (groupSerials: InspectableReturnSerial[], checked: boolean) => {
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
        setSelectedSerialCache((prev) => {
            const next = new Map(prev);
            groupSerials.forEach((serial) => {
                if (checked) next.set(serial.serialId, serial);
                else next.delete(serial.serialId);
            });
            return next;
        });
    };

    const displaySelectableIds = useMemo(
        () => displaySerials.filter((serial) => isSerialIncidentEligible(serial)).map((s) => s.serialId),
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
        return Array.from(selectedSerialCache.values()).map(toCancelSelectedSerial);
    }, [selectedSerialCache]);

    const reportDialogProps = useMemo(() => {
        const first = selectedSerialsForReport[0];
        return {
            ticketNumbers: first?.ticketNumbers || '',
            ticketId: first?.ticketId,
            importBatchLineId: first?.importBatchLineId || 0,
            stationId: selectedSerialCache.get(Number(first?.id))?.lotteryStationId ?? undefined,
            drawDate: selectedSerialCache.get(Number(first?.id))?.drawDate || undefined,
        };
    }, [selectedSerialsForReport, selectedSerialCache]);

    const handleToggleSelectAllDisplay = (checked: boolean) => {
        handleToggleGroup(
            displaySerials.filter((serial) => isSerialIncidentEligible(serial)),
            checked
        );
    };

    const handleToggleSingle = (serial: InspectableReturnSerial) => {
        const sId = serial.serialId;
        setSelectedSerialIds((prev) => {
            const next = new Set(prev);
            if (next.has(sId)) {
                next.delete(sId);
            } else {
                next.add(sId);
            }
            return next;
        });
        setSelectedSerialCache((prev) => {
            const next = new Map(prev);
            if (next.has(sId)) next.delete(sId);
            else next.set(sId, serial);
            return next;
        });
    };

    const clearSelectedSerials = () => {
        setSelectedSerialIds(new Set());
        setSelectedSerialCache(new Map());
    };

    const handleReportSuccess = () => {
        refetch();
        refetchBatch();
        clearSelectedSerials();
        setIsReportDialogOpen(false);
    };

    const handleReload = async () => {
        clearSelectedSerials();
        await Promise.all([refetch(), refetchBatch()]);
        toast.success('Đã tải lại trạng thái vé mới nhất.');
    };

    const requestCloseReportDialog = () => setIsCancelReportConfirmOpen(true);

    const confirmCloseReportDialog = () => {
        setIsCancelReportConfirmOpen(false);
        setIsReportDialogOpen(false);
        clearSelectedSerials();
    };

    const executeConfirmSubmit = async () => {
        try {
            await confirmInspection.mutateAsync({
                id: Number(batchId),
                payload: {
                    deliveryMode,
                    allEligible: true,
                },
            });
            toast.success('Đã xác nhận kiểm tra vé — phiếu hoàn tất kiểm tra.');
            router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batchId));
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            if (
                msg === RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE ||
                err?.response?.data?.errorCode === 'LT_120'
            ) {
                showInspectionExpiredPopup();
                refetch();
                return;
            }
            if (!err?.response) {
                return;
            }
            toast.error(msg || 'Không thể hoàn tất kiểm tra vé.');
        }
    };

    const handleConfirmInspectionSubmit = () => {
        if (selectedSerialIds.size > 0) {
            toast.warning('Cần xử lý sự cố cho vé được chọn trước.');
            return;
        }
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

    if (!batch) {
        return (
            <Box sx={{ width: '100%', pb: 5 }}>
                <PageHeader
                    title="Kiểm tra vé trả NCC"
                    breadcrumbItems={[
                        { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                        { label: 'Trả vé NCC', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                        { label: `Phiếu #${batchId}`, to: ROUTES.ADMIN.RETURN_BATCH.DETAIL(batchId) },
                        { label: 'Kiểm tra vé' },
                    ]}
                />
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                    <Typography color="text.secondary">Không tìm thấy thông tin phiếu trả vé hoặc đã xảy ra lỗi.</Typography>
                </Box>
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
                    {mutationsBlocked && (
                        <Box
                            sx={{
                                mb: 2.5,
                                p: { xs: 2, sm: 2.5 },
                                borderRadius: '12px',
                                border: '1px solid #fef08a',
                                bgcolor: '#fefce8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '10px',
                                    bgcolor: '#fef08a',
                                    color: '#a16207',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <LockOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700} color="#854d0e" sx={{ fontSize: '0.95rem', mb: 0.25 }}>
                                    Phiếu kiểm đếm đang bị khóa
                                </Typography>
                                <Typography variant="body2" color="#a16207" sx={{ fontSize: '0.85rem' }}>
                                    {RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {(
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
                                            label={`${inStockCount} vé ế còn lại`}
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
                                                    key={summary.lotteryStationId}
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
                                                            {summary.lotteryStationName || 'Không xác định'}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Tổng giá vốn:{' '}
                                                            <strong style={{ color: '#0F172A' }}>
                                                                {formatImportCost(summary.totalImportCost)} VNĐ
                                                            </strong>
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label={`${summary.eligibleSerialCount} vé`}
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
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: '100%' }}>
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
                                            sx={{ flex: 1, minWidth: { xs: '100%', md: 300 } }}
                                        />
                                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 230 } }}>
                                            <InputLabel id="return-station-filter-label">Nhà đài</InputLabel>
                                            <Select
                                                labelId="return-station-filter-label"
                                                value={selectedStationId}
                                                label="Nhà đài"
                                                onChange={(event) => {
                                                    const value = event.target.value as number | string;
                                                    setSelectedStationId(value === '' ? '' : Number(value));
                                                    setPage(0);
                                                }}
                                            >
                                                <MenuItem value="">Tất cả nhà đài ({inStockCount})</MenuItem>
                                                {stationSummaries.map((summary) => (
                                                    <MenuItem key={summary.lotteryStationId} value={summary.lotteryStationId}>
                                                        {summary.lotteryStationName || 'Không xác định'} ({summary.eligibleSerialCount})
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Button
                                            variant="outlined"
                                            startIcon={<RefreshIcon />}
                                            onClick={handleReload}
                                            disabled={isSerialsFetching}
                                            sx={{ minWidth: 120, textTransform: 'none', fontWeight: 700 }}
                                        >
                                            Tải lại
                                        </Button>
                                    </Stack>
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
                                            onClick={() => setIsReportDialogOpen(true)}
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
                                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
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
                                <TablePagination
                                    component="div"
                                    count={pagination?.totalRecords || 0}
                                    page={page}
                                    rowsPerPage={rowsPerPage}
                                    onPageChange={(_, nextPage) => setPage(nextPage)}
                                    onRowsPerPageChange={(event) => {
                                        setRowsPerPage(Number(event.target.value));
                                        setPage(0);
                                    }}
                                    rowsPerPageOptions={[5, 10, 20, 50]}
                                    labelRowsPerPage="Số dòng mỗi trang:"
                                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
                                />
                            </Box>
                        </Stack>
                    )}
                </Box>

                {/* Footer buttons */}
                {(
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

                        <Tooltip
                            title={
                                selectedSerialIds.size > 0
                                    ? 'Cần xử lý sự cố cho vé được chọn trước'
                                    : ''
                            }
                            arrow
                            placement="top"
                            disableHoverListener={selectedSerialIds.size === 0}
                        >
                            <span>
                                <Button
                                    variant="contained"
                                    loading={confirmInspection.isPending}
                                    onClick={handleConfirmInspectionSubmit}
                                    disabled={mutationsBlocked || inStockCount === 0 || selectedSerialIds.size > 0}
                                    label="Xác nhận kiểm tra"
                                    sx={{
                                        bgcolor: '#0F172A',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        px: 3,
                                        '&:hover': { bgcolor: '#1E293B' },
                                        '&.Mui-disabled': {
                                            bgcolor: selectedSerialIds.size > 0 ? 'rgba(15, 23, 42, 0.45)' : undefined,
                                            color: selectedSerialIds.size > 0 ? 'rgba(255, 255, 255, 0.7)' : undefined,
                                            cursor: 'not-allowed',
                                        },
                                    }}
                                />
                            </span>
                        </Tooltip>
                    </Box>
                )}
            </Card>

            <Dialog
                open={isReportDialogOpen}
                onClose={requestCloseReportDialog}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        p: 3,
                        maxHeight: '90vh',
                        height: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <LazyReportSerialFaultPane
                        serials={selectedSerialsForReport}
                        ticketNumbers={reportDialogProps.ticketNumbers}
                        ticketId={reportDialogProps.ticketId}
                        importBatchLineId={reportDialogProps.importBatchLineId}
                        stationId={reportDialogProps.stationId}
                        drawDate={reportDialogProps.drawDate}
                        defaultCancelMode="TICKET"
                        cancelButtonText="Hủy bỏ"
                        hideFaultedBySelector
                        beforeConfirm={() => {
                            if (mutationsBlocked) {
                                showInspectionExpiredPopup();
                                return false;
                            }
                            return true;
                        }}
                        onCancel={requestCloseReportDialog}
                        onSuccess={handleReportSuccess}
                    />
                </DialogContent>
            </Dialog>

            <Dialog
                open={isCancelReportConfirmOpen}
                onClose={() => setIsCancelReportConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Hủy báo sự cố?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Thông tin đang nhập sẽ không được lưu và toàn bộ sê-ri đã chọn sẽ được bỏ chọn.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" onClick={() => setIsCancelReportConfirmOpen(false)}>
                        Tiếp tục chỉnh sửa
                    </Button>
                    <Button variant="contained" color="error" onClick={confirmCloseReportDialog}>
                        Xác nhận hủy
                    </Button>
                </DialogActions>
            </Dialog>

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
                        justifyContent: 'space-between',
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
                                            <TableRow key={st.lotteryStationId} sx={{ '& td': { borderBottom: '1px solid #F1F5F9' } }}>
                                                <TableCell sx={{ py: 1, pl: 0, fontWeight: 600, color: '#334155' }}>
                                                    {st.lotteryStationName || 'Không xác định'}
                                                </TableCell>
                                                <TableCell align="center" sx={{ py: 1, color: '#0284C7', fontWeight: 600 }}>
                                                    {st.eligibleSerialCount} vé
                                                </TableCell>
                                                <TableCell align="right" sx={{ py: 1, pr: 0, fontWeight: 700, color: '#FF3030' }}>
                                                    {formatImportCost(st.totalImportCost)} VNĐ
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Paper>
                        )}

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
