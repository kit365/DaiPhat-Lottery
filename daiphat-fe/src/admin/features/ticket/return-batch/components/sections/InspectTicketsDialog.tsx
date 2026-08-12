"use client";

import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Card, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Paper, Radio, RadioGroup, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Button } from '../../../../../components/ui/Button';
import { LazyReportSerialFaultPane } from '../../../import-batch/components/sections/LazyReportSerialFaultPane';
import type { CancelSelectedSerial } from '../../../import-batch/hooks/useCancelTicketSelection';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { isFaultyTicketCondition, normalizeSerialStatus } from '../../../import-batch/utils/serialIncidentWorkflow';
import {
    useConfirmReturnInspection,
    useInspectableReturnSerials,
} from '../../hooks/useReturnBatch';
import type { InspectableReturnSerial, ReturnDeliveryMode } from '../../types/returnBatch.type';
import { RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE } from '../../types/returnBatch.type';

interface Props {
    open: boolean;
    batchId: number;
    inspectionExpired?: boolean;
    onClose: () => void;
    onCompleted: () => void;
}

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
    // Physical faults are tracked on ticketCondition (status stays IN_STOCK).
    if (isFaultyTicketCondition(serial.ticketCondition)) return false;
    return true;
};

const toCancelSelectedSerial = (serial: InspectableReturnSerial): CancelSelectedSerial => ({
    id: serial.serialId,
    serialNumber: serial.serialNumber,
    status: serial.status,
    ticketCondition: serial.ticketCondition,
    returnBatchLineId: undefined, // Cleared so ReportSerialFaultPane allows reporting faults during return batch inspection
    ticketId: serial.ticketId,
    ticketNumbers: serial.ticketNumbers || undefined,
    importBatchLineId: serial.importBatchLineId ?? undefined,
});

export const InspectTicketsDialog = ({
    open,
    batchId,
    inspectionExpired = false,
    onClose,
    onCompleted,
}: Props) => {
    const { data: serials = [], isLoading, refetch } = useInspectableReturnSerials(batchId, open);
    const confirmInspection = useConfirmReturnInspection();
    const mutationsBlocked = inspectionExpired;

    const [deliveryMode, setDeliveryMode] = useState<ReturnDeliveryMode>('RETAILER_DELIVERS');
    const [selectedSerialIds, setSelectedSerialIds] = useState<Set<number>>(new Set());
    const [activeStep, setActiveStep] = useState<'INSPECT' | 'REPORT'>('INSPECT');
    const [selectedStationTab, setSelectedStationTab] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showStationDetails, setShowStationDetails] = useState<boolean>(true);

    useEffect(() => {
        if (!open) return;
        setDeliveryMode('RETAILER_DELIVERS');
        setSelectedSerialIds(new Set());
        setActiveStep('INSPECT');
        setSelectedStationTab('ALL');
        setSearchQuery('');
        setShowStationDetails(true);
    }, [open]);

    // Only count serials that are currently IN_STOCK + GOOD
    const inStockSerials = useMemo(
        () => serials.filter(isReturnSelectableSerial),
        [serials]
    );

    // Drop selections that are no longer reportable (e.g. after fault report).
    useEffect(() => {
        const validIds = new Set(inStockSerials.map((s) => s.serialId));
        setSelectedSerialIds((prev) => {
            const next = new Set([...prev].filter((id) => validIds.has(id)));
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

    const displaySelectableIds = useMemo(
        () => displaySerials.map((s) => s.serialId),
        [displaySerials]
    );

    const selectedOnPageCount = useMemo(
        () => displaySelectableIds.filter((id) => selectedSerialIds.has(id)).length,
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
                displaySelectableIds.forEach((id) => next.add(id));
            } else {
                displaySelectableIds.forEach((id) => next.delete(id));
            }
            return next;
        });
    };

    const handleToggleSerial = (serialId: number, checked: boolean) => {
        setSelectedSerialIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(serialId);
            else next.delete(serialId);
            return next;
        });
    };

    const openReportDialog = () => {
        if (mutationsBlocked) {
            showInspectionExpiredPopup();
            return;
        }
        if (selectedSerialsForReport.length === 0) {
            toast.warning('Vui lòng chọn ít nhất một sê-ri để báo tình trạng.');
            return;
        }
        setActiveStep('REPORT');
    };

    const closeReportDialog = () => setActiveStep('INSPECT');

    const handleReportSuccess = () => {
        setActiveStep('INSPECT');
        setSelectedSerialIds(new Set());
        refetch();
        onCompleted();
    };

    const executeConfirm = async () => {
        if (mutationsBlocked) {
            await showInspectionExpiredPopup();
            return;
        }
        try {
            await confirmInspection.mutateAsync({
                id: batchId,
                payload: {
                    deliveryMode,
                    serialIds: inStockSerials.map((s) => s.serialId),
                    returnReceiptUrl: null,
                },
            });
            toast.success('Đã xác nhận kiểm tra — các sê-ri chuyển sang Chờ trả (PENDING-RETURN).');
            onCompleted();
            onClose();
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Không thể xác nhận kiểm tra vé.';
            if (
                message === RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE ||
                err?.response?.data?.errorCode === 'LT_120'
            ) {
                await showInspectionExpiredPopup();
                onCompleted();
                return;
            }
            toast.error(message);
        }
    };

    const handleConfirm = () => {
        if (mutationsBlocked) {
            showInspectionExpiredPopup();
            return;
        }
        if (inStockCount === 0) {
            toast.error('Không có sê-ri IN_STOCK nào đủ điều kiện để trả.');
            return;
        }

        const modeText =
            deliveryMode === 'RETAILER_DELIVERS'
                ? 'Mang trả NCC (Đại lý giao vé)'
                : 'NCC đến lấy (Nhận tại cửa hàng)';

        const stationTableRows = stationSummaries
            .map(
                (st) => `
                <tr style="border-bottom: 1px solid #F1F5F9;">
                    <td style="padding: 8px 0; font-weight: 600; color: #334155;">${st.stationName}</td>
                    <td style="padding: 8px 0; text-align: center; color: #0284C7; font-weight: 600;">${st.count} vé</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #FF3030;">${formatImportCost(st.totalCost)} VNĐ</td>
                </tr>
            `
            )
            .join('');

        Swal.fire({
            title: 'Xác nhận kiểm tra vé trả NCC?',
            html: `
                <div style="text-align: left; font-size: 0.875rem; color: #334155; line-height: 1.6;">
                    <p style="margin-bottom: 14px; color: #475569;">
                        Bạn có chắc chắn muốn xác nhận kiểm tra <strong>${inStockCount} vé</strong> đủ điều kiện trả cho nhà cung cấp?
                    </p>

                    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0;">
                            <span style="color: #64748B;">Hình thức giao trả:</span>
                            <span style="font-weight: 600; color: #0F172A;">${modeText}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0;">
                            <span style="color: #64748B;">Tổng số lượng vé:</span>
                            <span style="font-weight: 700; color: #0284C7;">${inStockCount} vé</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748B;">Tổng giá trị vốn ước tính:</span>
                            <span style="font-weight: 700; color: #FF3030; font-size: 0.95rem;">${formatImportCost(inStockValue)} VNĐ</span>
                        </div>
                    </div>

                    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
                        <div style="font-weight: 700; color: #1E293B; margin-bottom: 8px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">
                            Chi tiết theo từng nhà đài
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid #E2E8F0; color: #64748B; text-align: left;">
                                    <th style="padding: 6px 0; font-weight: 600;">Nhà đài</th>
                                    <th style="padding: 6px 0; text-align: center; font-weight: 600;">Số lượng</th>
                                    <th style="padding: 6px 0; text-align: right; font-weight: 600;">Giá trị vốn</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stationTableRows}
                            </tbody>
                        </table>
                    </div>

                    <div style="font-size: 0.8rem; color: #78350F; background: #FEF3C7; border: 1px solid #FDE68A; padding: 10px 12px; border-radius: 8px;">
                        Lưu ý: Sau khi xác nhận, tất cả sê-ri trên sẽ được chuyển sang trạng thái <strong>Chờ trả vé (PENDING_RETURN)</strong>.
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#FF3030',
            cancelButtonColor: '#919EAB',
            confirmButtonText: 'Xác nhận ngay',
            cancelButtonText: 'Hủy bỏ',
        }).then((result) => {
            if (result.isConfirmed) {
                void executeConfirm();
            }
        });
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.18)',
                        overflow: 'hidden',
                        maxHeight: '90vh',
                        height: activeStep === 'REPORT' ? '90vh' : 'auto',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        py: 2,
                        px: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #E5E7EB',
                        bgcolor: '#FAFBFC',
                    }}
                >
                    <Box>
                        <Typography variant="h6" fontWeight={700} color="#111827">
                            Kiểm tra vé trả NCC
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Rà soát dải sê-ri vé kho và chọn hình thức giao trả cho nhà cung cấp
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small" sx={{ color: '#6B7280' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent
                    sx={{
                        p: activeStep === 'REPORT' ? 0 : 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: activeStep === 'REPORT' ? 'hidden' : 'auto',
                    }}
                >
                    {mutationsBlocked && activeStep === 'INSPECT' && (
                        <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
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
                        <>
                            <Box sx={{ mb: 2.5, width: '100%' }}>
                        <Card
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                borderColor: '#E5E7EB',
                                width: '100%',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={700} color="#374151" mb={1.5}>
                                Hình thức giao trả{' '}
                                <Typography component="span" color="error.main">
                                    *
                                </Typography>
                            </Typography>
                            <RadioGroup
                                value={deliveryMode}
                                onChange={(e) => setDeliveryMode(e.target.value as ReturnDeliveryMode)}
                                sx={{ width: '100%', pointerEvents: mutationsBlocked ? 'none' : 'auto', opacity: mutationsBlocked ? 0.7 : 1 }}
                            >
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                        gap: 2,
                                        width: '100%',
                                    }}
                                >
                                    <Paper
                                        variant="outlined"
                                        onClick={() => setDeliveryMode('RETAILER_DELIVERS')}
                                        sx={{
                                            p: 2,
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            borderColor:
                                                deliveryMode === 'RETAILER_DELIVERS' ? '#FF3030' : '#E5E7EB',
                                            bgcolor: deliveryMode === 'RETAILER_DELIVERS' ? '#F4FBF7' : '#fff',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            boxShadow:
                                                deliveryMode === 'RETAILER_DELIVERS'
                                                    ? '0 0 0 1px #FF3030'
                                                    : 'none',
                                            transition: 'all 0.2s ease-in-out',
                                            boxSizing: 'border-box',
                                            '&:hover': { borderColor: '#FF3030' },
                                        }}
                                    >
                                        <Radio
                                            size="small"
                                            checked={deliveryMode === 'RETAILER_DELIVERS'}
                                            sx={{
                                                mt: -0.25,
                                                mr: 1.25,
                                                color: '#919EAB',
                                                '&.Mui-checked': { color: '#FF3030' },
                                            }}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" fontWeight={600} color="#1F2937">
                                                Mang trả NCC (Chờ giao vé → Đã trả)
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                                mt={0.5}
                                                sx={{ lineHeight: 1.4 }}
                                            >
                                                Đại lý tự vận chuyển vé đến giao trực tiếp cho đại lý/nhà cung cấp
                                            </Typography>
                                        </Box>
                                    </Paper>

                                    <Paper
                                        variant="outlined"
                                        onClick={() => setDeliveryMode('SUPPLIER_COLLECTS')}
                                        sx={{
                                            p: 2,
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            borderColor:
                                                deliveryMode === 'SUPPLIER_COLLECTS' ? '#FF3030' : '#E5E7EB',
                                            bgcolor: deliveryMode === 'SUPPLIER_COLLECTS' ? '#F4FBF7' : '#fff',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            boxShadow:
                                                deliveryMode === 'SUPPLIER_COLLECTS'
                                                    ? '0 0 0 1px #FF3030'
                                                    : 'none',
                                            transition: 'all 0.2s ease-in-out',
                                            boxSizing: 'border-box',
                                            '&:hover': { borderColor: '#FF3030' },
                                        }}
                                    >
                                        <Radio
                                            size="small"
                                            checked={deliveryMode === 'SUPPLIER_COLLECTS'}
                                            sx={{
                                                mt: -0.25,
                                                mr: 1.25,
                                                color: '#919EAB',
                                                '&.Mui-checked': { color: '#FF3030' },
                                            }}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" fontWeight={600} color="#1F2937">
                                                NCC đến lấy (Chờ giao vé → Đã trả)
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                                mt={0.5}
                                                sx={{ lineHeight: 1.4 }}
                                            >
                                                Đại diện nhà cung cấp đến nhận trực tiếp tại cửa hàng
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Box>
                            </RadioGroup>
                        </Card>
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            px: 2.5,
                            mb: 2.5,
                            borderRadius: '12px',
                            bgcolor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 1.5,
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center">
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
                                <Typography variant="body2" color="text.primary">
                                    Tổng giá trị vốn ước tính:{' '}
                                    <Typography
                                        component="span"
                                        fontWeight={700}
                                        color="success.main"
                                        fontSize="1.05rem"
                                    >
                                        {formatImportCost(inStockValue)} VNĐ
                                    </Typography>
                                </Typography>
                                <Button
                                    size="small"
                                    onClick={() => setShowStationDetails(!showStationDetails)}
                                    endIcon={
                                        showStationDetails ? (
                                            <KeyboardArrowUpIcon />
                                        ) : (
                                            <KeyboardArrowDownIcon />
                                        )
                                    }
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        color: '#0284C7',
                                    }}
                                >
                                    {showStationDetails ? 'Thu gọn chi tiết' : 'Chi tiết từng đài'}
                                </Button>
                            </Stack>
                        </Box>

                        <Collapse in={showStationDetails}>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(auto-fit, minmax(220px, 1fr))',
                                    },
                                    gap: 1.5,
                                    mt: 2,
                                    pt: 2,
                                    borderTop: '1px dashed #CBD5E1',
                                }}
                            >
                                {stationSummaries.map((item) => (
                                    <Paper
                                        key={item.stationName}
                                        variant="outlined"
                                        sx={{
                                            p: 1.5,
                                            borderRadius: '10px',
                                            bgcolor: '#FFFFFF',
                                            borderColor: '#E2E8F0',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.75,
                                        }}
                                    >
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle2" fontWeight={700} color="#1E293B">
                                                {item.stationName}
                                            </Typography>
                                            <Chip
                                                label={`${item.count} vé`}
                                                size="small"
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    bgcolor: '#E0F2FE',
                                                    color: '#0369A1',
                                                }}
                                            />
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary">
                                                Tổng giá vốn:
                                            </Typography>
                                            <Typography variant="caption" fontWeight={700} color="#FF3030">
                                                {formatImportCost(item.totalCost)} VNĐ
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary">
                                                Tổng giá bán:
                                            </Typography>
                                            <Typography variant="caption" fontWeight={600} color="#475569">
                                                {formatImportCost(item.totalPrice)} VNĐ
                                            </Typography>
                                        </Box>
                                    </Paper>
                                ))}
                            </Box>
                        </Collapse>
                    </Box>

                    {/* Ticket list header: tabs + report action + search */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: { xs: 'stretch', md: 'center' },
                            justifyContent: 'space-between',
                            gap: 2,
                            mb: 2,
                            borderBottom: '1px solid #E5E7EB',
                            pb: 1,
                        }}
                    >
                        <Tabs
                            value={selectedStationTab}
                            onChange={(_, val) => setSelectedStationTab(val)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                minHeight: 38,
                                flex: 1,
                                minWidth: 0,
                                '& .MuiTab-root': {
                                    minHeight: 38,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    py: 0.5,
                                    color: '#6B7280',
                                    '&.Mui-selected': { color: '#FF3030' },
                                },
                                '& .MuiTabs-indicator': { backgroundColor: '#FF3030' },
                            }}
                        >
                            <Tab label={`Tất cả (${inStockSerials.length})`} value="ALL" />
                            {stationNames.map((name) => {
                                const count = inStockSerials.filter((s) => s.lotteryStationName === name)
                                    .length;
                                return <Tab key={name} label={`${name} (${count})`} value={name} />;
                            })}
                        </Tabs>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.25}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            sx={{ flexShrink: 0 }}
                        >
                            <TextField
                                size="small"
                                placeholder="Tìm mã sê-ri, số vé, nhà đài..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: '#919EAB' }} />
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        borderRadius: '8px',
                                        bgcolor: '#fff',
                                        fontSize: '0.85rem',
                                        width: { xs: '100%', sm: 260 },
                                    },
                                }}
                            />
                        </Stack>
                    </Box>

                    {isLoading ? (
                        <Box display="flex" justifyContent="center" py={6}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : (
                        <TableContainer
                            sx={{
                                maxHeight: 380,
                                border: '1px solid #E5E7EB',
                                borderRadius: '10px',
                                overflow: 'auto',
                            }}
                        >
                            <Table size="small" stickyHeader sx={{ minWidth: 650 }}>
                                <TableHead>
                                    <TableRow
                                        sx={{
                                            '& th': {
                                                bgcolor: '#FAFBFC',
                                                fontWeight: 600,
                                                color: '#4B5563',
                                            },
                                        }}
                                    >
                                        <TableCell padding="checkbox" sx={{ width: 48 }}>
                                            <Checkbox
                                                size="small"
                                                checked={allDisplaySelected}
                                                indeterminate={someDisplaySelected}
                                                disabled={mutationsBlocked || displaySelectableIds.length === 0}
                                                onChange={(e) =>
                                                    handleToggleSelectAllDisplay(e.target.checked)
                                                }
                                                inputProps={{
                                                    'aria-label': 'Chọn tất cả sê-ri đang hiển thị',
                                                }}
                                            />
                                        </TableCell>
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
                                    {displaySerials.map((row) => {
                                        const isSelectable = isReturnSelectableSerial(row);
                                        const checked = selectedSerialIds.has(row.serialId);
                                        return (
                                            <TableRow
                                                key={row.serialId}
                                                hover
                                                selected={checked}
                                                onClick={() => {
                                                    if (isSelectable) {
                                                        handleToggleSerial(row.serialId, !checked);
                                                    }
                                                }}
                                                sx={{
                                                    opacity: isSelectable ? 1 : 0.6,
                                                    cursor: isSelectable ? 'pointer' : 'default',
                                                }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        size="small"
                                                        checked={checked}
                                                        disabled={!isSelectable || mutationsBlocked}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) =>
                                                            handleToggleSerial(
                                                                row.serialId,
                                                                e.target.checked
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {row.lotteryStationName || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {row.ticketNumbers || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                                                    >
                                                        {row.serialNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={
                                                            normalizeSerialStatus(row.status) === 'IN_STOCK'
                                                                ? 'Trong kho'
                                                                : row.status || 'Trong kho'
                                                        }
                                                        size="small"
                                                        color={normalizeSerialStatus(row.status) === 'IN_STOCK' ? 'success' : 'warning'}
                                                        variant={normalizeSerialStatus(row.status) === 'IN_STOCK' ? 'outlined' : 'filled'}
                                                        sx={{
                                                            height: 22,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={
                                                            isFaultyTicketCondition(row.ticketCondition)
                                                                ? row.ticketConditionDisplayName ||
                                                                  (row.ticketCondition === 'DAMAGED'
                                                                      ? 'Hỏng vật lý'
                                                                      : row.ticketCondition === 'LOST'
                                                                        ? 'Thất lạc'
                                                                        : row.ticketCondition || 'Hỏng')
                                                                : 'Tốt'
                                                        }
                                                        size="small"
                                                        color={isFaultyTicketCondition(row.ticketCondition) ? 'error' : 'success'}
                                                        variant={isFaultyTicketCondition(row.ticketCondition) ? 'filled' : 'outlined'}
                                                        sx={{
                                                            height: 22,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        color="text.secondary"
                                                    >
                                                        {formatImportCost(row.ticketPrice ?? 10000)} VNĐ
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        color="text.primary"
                                                    >
                                                        {formatImportCost(row.importCost)} VNĐ
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {displaySerials.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                                <Typography color="text.secondary">
                                                    {searchQuery
                                                        ? 'Không tìm thấy sê-ri phù hợp.'
                                                        : 'Không còn sê-ri IN_STOCK đủ điều kiện trả.'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            )}
                </DialogContent>

                {activeStep === 'INSPECT' && (
                    <DialogActions sx={{ px: 3, py: 2, bgcolor: '#FAFBFC', borderTop: '1px solid #E5E7EB' }}>
                        <Button
                            variant="outlined"
                            onClick={onClose}
                            sx={{
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 600,
                                color: '#374151',
                                borderColor: '#D1D5DB',
                            }}
                        >
                            Đóng
                        </Button>
                        {selectedSerialIds.size > 0 ? (
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<ReportProblemIcon />}
                                onClick={openReportDialog}
                                disabled={mutationsBlocked}
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    bgcolor: '#ef4444',
                                    px: 2.5,
                                    '&:hover': { bgcolor: '#dc2626' },
                                }}
                            >
                                Báo tình trạng ({selectedSerialIds.size})
                            </Button>
                        ) : (
                            <Button
                                label="Xác nhận kiểm tra"
                                className="btn-primary-admin"
                                loading={confirmInspection.isPending}
                                onClick={handleConfirm}
                                disabled={mutationsBlocked || inStockCount === 0}
                            />
                        )}
                    </DialogActions>
                )}
            </Dialog>
        </>
    );
};
