import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppToast } from '../../../../../../utils/toast.util';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useInspectableReturnTickets } from '../../hooks/useReturnBatch';
import type { InspectableReturnSerial, ReturnBatchLine } from '../../types/returnBatch.type';
import { getInspectableTicketConditionLabel } from '../../utils/returnInspectableSerial';

interface Props {
    open: boolean;
    batchId: number;
    supplierName?: string | null;
    drawDate?: string | null;
    lines?: ReturnBatchLine[];
    initialStationName?: string | null;
    onClose: () => void;
}

interface TicketGroup {
    ticketKey: string;
    lotteryStationName: string;
    ticketNumbers: string;
    ticketPrice: number;
    serials: InspectableReturnSerial[];
}

const headCellStyles = {
    backgroundColor: '#f8fafc !important',
    color: '#475569',
    fontWeight: 800,
    fontSize: '0.78rem',
    py: 1.5,
    borderBottom: '2px solid #e2e8f0',
    zIndex: 10,
};

const CollapsibleReturnTicketRow = ({
    ticketGroup,
    index,
    page,
    rowsPerPage,
}: {
    ticketGroup: TicketGroup;
    index: number;
    page: number;
    rowsPerPage: number;
}) => {
    const [open, setOpen] = useState(false);
    const firstSerial = ticketGroup.serials[0];
    const statusLabel = firstSerial?.statusLabel || firstSerial?.status || 'Trong kho';
    const conditionLabel = getInspectableTicketConditionLabel(firstSerial);

    // Check if any serial is damaged
    const damagedSerialsCount = ticketGroup.serials.filter(
        (s) => s.ticketCondition && s.ticketCondition !== 'NORMAL' && s.ticketCondition !== 'GOOD'
    ).length;

    const handleCopySerial = (serialNumber: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(serialNumber);
        AppToast.success(`Đã sao chép sê-ri: ${serialNumber}`);
    };

    return (
        <React.Fragment>
            <TableRow
                sx={{
                    '& > *': { borderBottom: open ? 'none' : '1px solid #f1f5f9' },
                    cursor: 'pointer',
                    bgcolor: open ? '#f8fafc' : '#ffffff',
                    '&:hover': { bgcolor: open ? '#f1f5f9' : '#f8fafc' },
                    transition: 'background-color 0.15s ease',
                }}
                onClick={() => setOpen(!open)}
            >
                <TableCell sx={{ width: 44, py: 1.5, pl: 2 }}>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(!open);
                        }}
                        sx={{
                            width: 28,
                            height: 28,
                            bgcolor: open ? '#e2e8f0' : '#f1f5f9',
                            color: open ? '#0f172a' : '#64748b',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: '#cbd5e1' },
                        }}
                    >
                        {open ? (
                            <KeyboardArrowUpIcon fontSize="small" />
                        ) : (
                            <KeyboardArrowDownIcon fontSize="small" />
                        )}
                    </IconButton>
                </TableCell>

                <TableCell align="center" sx={{ py: 1.5, width: 50 }}>
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '6px',
                            bgcolor: '#f1f5f9',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#64748b',
                        }}
                    >
                        {page * rowsPerPage + index + 1}
                    </Box>
                </TableCell>

                <TableCell sx={{ fontWeight: 700, color: '#0f172a', py: 1.5, fontSize: '0.875rem' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <span>{ticketGroup.lotteryStationName || '—'}</span>
                    </Stack>
                </TableCell>

                <TableCell component="th" scope="row" sx={{ py: 1.5 }}>
                    <Box
                        sx={{
                            display: 'inline-block',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.925rem',
                            letterSpacing: '1px',
                            bgcolor: '#fef2f2',
                            color: '#dc2626',
                            border: '1px dashed #fca5a5',
                            borderRadius: '8px',
                            px: 1.25,
                            py: 0.35,
                        }}
                    >
                        {ticketGroup.ticketNumbers || '—'}
                    </Box>
                </TableCell>

                <TableCell sx={{ py: 1.5 }}>
                    <Chip
                        size="small"
                        label={`${ticketGroup.serials.length} sê-ri`}
                        sx={{
                            bgcolor: '#eff6ff',
                            color: '#2563eb',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 24,
                            border: '1px solid #bfdbfe',
                        }}
                    />
                </TableCell>

                <TableCell align="center" sx={{ py: 1.5 }}>
                    <Chip
                        label={statusLabel}
                        size="small"
                        sx={{
                            height: 24,
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            bgcolor:
                                firstSerial?.status === 'IN_STOCK' || !firstSerial?.status
                                    ? '#f0fdf4'
                                    : firstSerial?.status === 'SOLD'
                                      ? '#eff6ff'
                                      : '#fffbeb',
                            color:
                                firstSerial?.status === 'IN_STOCK' || !firstSerial?.status
                                    ? '#16a34a'
                                    : firstSerial?.status === 'SOLD'
                                      ? '#2563eb'
                                      : '#d97706',
                            border:
                                firstSerial?.status === 'IN_STOCK' || !firstSerial?.status
                                    ? '1px solid #bbf7d0'
                                    : firstSerial?.status === 'SOLD'
                                      ? '1px solid #bfdbfe'
                                      : '1px solid #fde68a',
                        }}
                    />
                </TableCell>

                <TableCell align="center" sx={{ py: 1.5 }}>
                    {damagedSerialsCount > 0 ? (
                        <Chip
                            icon={<WarningAmberOutlinedIcon style={{ fontSize: '0.85rem', color: '#dc2626' }} />}
                            label={`${damagedSerialsCount} vé lỗi/hỏng`}
                            size="small"
                            sx={{
                                height: 24,
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                bgcolor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                            }}
                        />
                    ) : (
                        <Chip
                            icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.85rem', color: '#16a34a' }} />}
                            label={conditionLabel}
                            size="small"
                            sx={{
                                height: 24,
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                bgcolor: '#f0fdf4',
                                color: '#16a34a',
                                border: '1px solid #bbf7d0',
                            }}
                        />
                    )}
                </TableCell>

                <TableCell align="right" sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="#64748b" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                        {formatImportCost(ticketGroup.ticketPrice)}{' '}
                        <Box component="span" sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            đ
                        </Box>
                    </Typography>
                </TableCell>

            </TableRow>

            {/* Nested Accordion for Physical Serials */}
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box
                            sx={{
                                my: 1.5,
                                p: 2,
                                bgcolor: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            }}
                        >
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ mb: 1.5, pb: 1, borderBottom: '1px solid #f1f5f9' }}
                            >
                                <Typography variant="caption" fontWeight={800} color="#334155" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Danh sách {ticketGroup.serials.length} sê-ri vé vật lý thuộc dãy số #{ticketGroup.ticketNumbers}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Đài: <strong>{ticketGroup.lotteryStationName}</strong>
                                </Typography>
                            </Stack>

                            <Table size="small" aria-label="nested serials table">
                                <TableHead>
                                    <TableRow sx={{ '& th': { bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.75rem', py: 0.75 } }}>
                                        <TableCell width={45} align="center">STT</TableCell>
                                        <TableCell>Mã sê-ri vật lý</TableCell>
                                        <TableCell align="center">Trạng thái kho</TableCell>
                                        <TableCell align="center">Tình trạng vé</TableCell>
                                        <TableCell align="right">Giá bán niêm yết</TableCell>
                                        <TableCell width={50} align="center">Sao chép</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {ticketGroup.serials.map((s, sIndex) => {
                                        const isDamaged =
                                            s.ticketCondition &&
                                            s.ticketCondition !== 'NORMAL' &&
                                            s.ticketCondition !== 'GOOD';

                                        return (
                                            <TableRow
                                                key={s.serialId || sIndex}
                                                sx={{
                                                    '&:hover': { bgcolor: '#f8fafc' },
                                                    '&:last-child td': { borderBottom: 0 },
                                                }}
                                            >
                                                <TableCell align="center" sx={{ py: 1, color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    {sIndex + 1}
                                                </TableCell>

                                                <TableCell sx={{ py: 1 }}>
                                                    <Box
                                                        sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            fontFamily: 'monospace',
                                                            fontWeight: 700,
                                                            fontSize: '0.85rem',
                                                            bgcolor: '#f1f5f9',
                                                            color: '#1e293b',
                                                            px: 1,
                                                            py: 0.25,
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e1',
                                                        }}
                                                    >
                                                        {s.serialNumber}
                                                    </Box>
                                                </TableCell>

                                                <TableCell align="center" sx={{ py: 1 }}>
                                                    <Chip
                                                        label={s.statusLabel || s.status || 'Trong kho'}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.675rem',
                                                            fontWeight: 700,
                                                            bgcolor:
                                                                s.status === 'IN_STOCK' || !s.status
                                                                    ? '#f0fdf4'
                                                                    : s.status === 'SOLD'
                                                                      ? '#eff6ff'
                                                                      : '#fffbeb',
                                                            color:
                                                                s.status === 'IN_STOCK' || !s.status
                                                                    ? '#16a34a'
                                                                    : s.status === 'SOLD'
                                                                      ? '#2563eb'
                                                                      : '#d97706',
                                                        }}
                                                    />
                                                </TableCell>

                                                <TableCell align="center" sx={{ py: 1 }}>
                                                    <Chip
                                                        label={getInspectableTicketConditionLabel(s)}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.675rem',
                                                            fontWeight: 700,
                                                            bgcolor: isDamaged ? '#fef2f2' : '#f0fdf4',
                                                            color: isDamaged ? '#dc2626' : '#16a34a',
                                                            border: isDamaged ? '1px solid #fecaca' : '1px solid #bbf7d0',
                                                        }}
                                                    />
                                                </TableCell>

                                                <TableCell align="right" sx={{ py: 1, fontSize: '0.8rem', color: '#64748b' }}>
                                                    {formatImportCost(s.ticketPrice ?? ticketGroup.ticketPrice)} đ
                                                </TableCell>

                                                <TableCell align="center" sx={{ py: 1 }}>
                                                    <Tooltip title="Sao chép số sê-ri">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => handleCopySerial(s.serialNumber, e)}
                                                            sx={{ color: '#94a3b8', '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}
                                                        >
                                                            <ContentCopyIcon sx={{ fontSize: '0.9rem' }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

export const ReturnBatchTicketsModal = ({
    open,
    batchId,
    supplierName,
    drawDate,
    initialStationName,
    onClose,
}: Props) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedStationId, setSelectedStationId] = useState<number | ''>('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const initialStationAppliedRef = useRef(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
            setPage(0);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [searchQuery]);

    const {
        data: inspectableData,
        isLoading,
        isError,
        error,
        refetch,
    } = useInspectableReturnTickets(
        batchId,
        {
            page: page + 1,
            size: rowsPerPage,
            search: debouncedSearch || undefined,
            lotteryStationId: selectedStationId || undefined,
        },
        open
    );

    const loadErrorMessage =
        (error as any)?.response?.data?.message
        || 'Không thể tải danh sách vé kiểm tra trả. Vui lòng thử lại.';

    useEffect(() => {
        if (open) {
            initialStationAppliedRef.current = false;
            setSelectedStationId('');
            setSearchQuery('');
            setPage(0);
        }
    }, [open, batchId, initialStationName]);

    // Resolve the initial station from the batch-level options once per modal opening.
    // Keeping this separate prevents every page response from resetting pagination to page 1.
    useEffect(() => {
        if (!open || initialStationAppliedRef.current || !inspectableData?.stationSummaries) {
            return;
        }
        const initialStation = inspectableData.stationSummaries.find(
            (summary) => summary.lotteryStationName === initialStationName
        );
        setSelectedStationId(initialStation?.lotteryStationId || '');
        initialStationAppliedRef.current = true;
    }, [open, initialStationName, inspectableData?.stationSummaries]);

    const filteredSerials = useMemo(
        () => (inspectableData?.recordList ?? []).flatMap((ticket) => ticket.serials || []),
        [inspectableData?.recordList]
    );

    // Group serials by ticket number & station name
    const groupedTickets = useMemo(() => {
        const groupMap = new Map<string, TicketGroup>();

        (inspectableData?.recordList ?? []).forEach((ticket) => {
            const key = String(ticket.ticketId);
            groupMap.set(key, {
                ticketKey: key,
                lotteryStationName: ticket.lotteryStationName || '—',
                ticketNumbers: ticket.ticketNumbers || '—',
                ticketPrice: Number(ticket.ticketPrice) || 10000,
                serials: ticket.serials || [],
            });
        });

        return Array.from(groupMap.values());
    }, [inspectableData?.recordList]);

    // Totals for filtered serials
    const totalCount = Number(inspectableData?.eligibleSerialCount || 0);

    const totalWholesalePrice = Number(inspectableData?.eligibleReturnValue || 0);

    const totalTicketPrice = useMemo(() => {
        return filteredSerials.reduce((acc, item) => {
            const price = Number(item.ticketPrice) || 0;
            return acc + price;
        }, 0);
    }, [filteredSerials]);

    // Paginated ticket groups
    const paginatedTickets = groupedTickets;

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    bgcolor: '#ffffff',
                },
            }}
        >
            {/* Elegant Modern Dialog Header */}
            <DialogTitle
                sx={{
                    m: 0,
                    p: 2.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                    bgcolor: '#ffffff',
                }}
            >
                <Stack direction="row" spacing={1.75} alignItems="center">
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: '#fef2f2',
                            color: '#FF3030',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(255,48,48,0.15)',
                        }}
                    >
                        <ConfirmationNumberOutlinedIcon sx={{ fontSize: 24 }} />
                    </Box>

                    <Box>
                        <Typography
                            variant="h6"
                            fontWeight={800}
                            sx={{ color: '#0f172a', fontSize: '1.125rem', lineHeight: 1.3 }}
                        >
                            Danh sách vé kiểm tra trả nhà cung cấp #{batchId}
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                            {supplierName && (
                                <Chip
                                    size="small"
                                    label={`NCC: ${supplierName}`}
                                    sx={{
                                        height: 22,
                                        bgcolor: '#f8fafc',
                                        color: '#475569',
                                        fontWeight: 600,
                                        fontSize: '0.725rem',
                                        border: '1px solid #e2e8f0',
                                    }}
                                />
                            )}
                            {drawDate && (
                                <Chip
                                    size="small"
                                    label={`Ngày quay: ${dayjs(drawDate).format('DD/MM/YYYY')}`}
                                    sx={{
                                        height: 22,
                                        bgcolor: '#f8fafc',
                                        color: '#475569',
                                        fontWeight: 600,
                                        fontSize: '0.725rem',
                                        border: '1px solid #e2e8f0',
                                    }}
                                />
                            )}
                        </Stack>
                    </Box>
                </Stack>

                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        color: '#64748b',
                        bgcolor: '#f1f5f9',
                        borderRadius: '10px',
                        '&:hover': { bgcolor: '#e2e8f0', color: '#0f172a' },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#ffffff' }}>
                <Stack spacing={2.5}>
                    {/* Modern 3-Card KPI Summary */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                            gap: 2,
                        }}
                    >
                        {/* Card 1: Total Serials */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: '14px',
                                bgcolor: '#f8fafc',
                                borderColor: '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                transition: 'all 0.2s ease',
                                '&:hover': { borderColor: '#bfdbfe', bgcolor: '#eff6ff22' },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '12px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <ConfirmationNumberOutlinedIcon sx={{ fontSize: 22 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                    Số lượng vé trả (sê-ri)
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#0284c7" sx={{ lineHeight: 1.2, my: 0.25 }}>
                                    {totalCount}{' '}
                                    <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                                        vé
                                    </Box>
                                </Typography>
                                <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.725rem' }}>
                                    {inspectableData?.pagination?.totalRecords || 0} dãy số độc lập
                                </Typography>
                            </Box>
                        </Paper>

                        {/* Card 2: Wholesale Price (Cost) */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: '14px',
                                bgcolor: '#f8fafc',
                                borderColor: '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                transition: 'all 0.2s ease',
                                '&:hover': { borderColor: '#fecaca', bgcolor: '#fef2f222' },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '12px',
                                    bgcolor: '#fef2f2',
                                    color: '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 22 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                    Tổng giá vốn hoàn trả
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#dc2626" sx={{ lineHeight: 1.2, my: 0.25 }}>
                                    {formatImportCost(totalWholesalePrice)}{' '}
                                    <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                                        VNĐ
                                    </Box>
                                </Typography>
                                <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.725rem' }}>
                                    Giá vốn tính cho nhà cung cấp
                                </Typography>
                            </Box>
                        </Paper>

                        {/* Card 3: Ticket Retail Price */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: '14px',
                                bgcolor: '#f8fafc',
                                borderColor: '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                transition: 'all 0.2s ease',
                                '&:hover': { borderColor: '#ddd6fe', bgcolor: '#f5f3ff22' },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '12px',
                                    bgcolor: '#f5f3ff',
                                    color: '#7c3aed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <SellOutlinedIcon sx={{ fontSize: 22 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                    Tổng giá bán dự kiến
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#7c3aed" sx={{ lineHeight: 1.2, my: 0.25 }}>
                                    {formatImportCost(totalTicketPrice)}{' '}
                                    <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                                        VNĐ
                                    </Box>
                                </Typography>
                                <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.725rem' }}>
                                    Mệnh giá niêm yết bán lẻ
                                </Typography>
                            </Box>
                        </Paper>
                    </Box>

                    {/* Filter & Station Tabs Control Bar */}
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: 'stretch', md: 'center' }}
                    >
                        {/* Search Input */}
                        <TextField
                            placeholder="Tìm kiếm mã sê-ri, số vé, nhà đài..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(0);
                            }}
                            size="small"
                            sx={{
                                minWidth: { md: 340 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    bgcolor: '#f8fafc',
                                    '&:hover': { bgcolor: '#ffffff' },
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery ? (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setPage(0);
                                            }}
                                            edge="end"
                                        >
                                            <ClearIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null,
                            }}
                        />

                        {/* Station Filter Pills */}
                        {(inspectableData?.stationSummaries?.length ?? 0) > 0 && (
                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                    overflowX: 'auto',
                                    py: 0.5,
                                    '::-webkit-scrollbar': { height: 4 },
                                    '::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 4 },
                                }}
                            >
                                <Button
                                    size="small"
                                    variant={selectedStationId === '' ? 'contained' : 'outlined'}
                                    onClick={() => {
                                        setSelectedStationId('');
                                        setPage(0);
                                    }}
                                    sx={{
                                        borderRadius: '20px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.8125rem',
                                        px: 2,
                                        py: 0.6,
                                        boxShadow: 'none',
                                        bgcolor: selectedStationId === '' ? '#0f172a' : '#ffffff',
                                        color: selectedStationId === '' ? '#ffffff' : '#475569',
                                        borderColor: selectedStationId === '' ? '#0f172a' : '#cbd5e1',
                                        '&:hover': {
                                            bgcolor: selectedStationId === '' ? '#1e293b' : '#f8fafc',
                                            borderColor: selectedStationId === '' ? '#1e293b' : '#94a3b8',
                                            boxShadow: 'none',
                                        },
                                        flexShrink: 0,
                                    }}
                                >
                                    Tất cả ({totalCount})
                                </Button>

                                {(inspectableData?.stationSummaries ?? []).map((summary) => {
                                    const isSelected = selectedStationId === summary.lotteryStationId;

                                    return (
                                        <Button
                                            key={summary.lotteryStationId}
                                            size="small"
                                            variant={isSelected ? 'contained' : 'outlined'}
                                            onClick={() => {
                                                setSelectedStationId(summary.lotteryStationId);
                                                setPage(0);
                                            }}
                                            sx={{
                                                borderRadius: '20px',
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                fontSize: '0.8125rem',
                                                px: 2,
                                                py: 0.6,
                                                boxShadow: 'none',
                                                bgcolor: isSelected ? '#0f172a' : '#ffffff',
                                                color: isSelected ? '#ffffff' : '#475569',
                                                borderColor: isSelected ? '#0f172a' : '#cbd5e1',
                                                '&:hover': {
                                                    bgcolor: isSelected ? '#1e293b' : '#f8fafc',
                                                    borderColor: isSelected ? '#1e293b' : '#94a3b8',
                                                    boxShadow: 'none',
                                                },
                                                flexShrink: 0,
                                            }}
                                        >
                                            {summary.lotteryStationName || 'Không xác định'} ({summary.eligibleSerialCount})
                                        </Button>
                                    );
                                })}
                            </Stack>
                        )}
                    </Stack>

                    {/* Main Table Container */}
                    {isLoading ? (
                        <Box
                            display="flex"
                            flexDirection="column"
                            justifyContent="center"
                            alignItems="center"
                            minHeight={260}
                            gap={1.5}
                        >
                            <CircularProgress size={36} sx={{ color: '#FF3030' }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                Đang tải danh sách vé kiểm tra trả...
                            </Typography>
                        </Box>
                    ) : isError ? (
                        <Alert
                            severity="error"
                            sx={{ borderRadius: '12px', alignItems: 'center' }}
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => refetch()}
                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                >
                                    Thử lại
                                </Button>
                            }
                        >
                            {loadErrorMessage}
                        </Alert>
                    ) : (
                        <TableContainer
                            component={Paper}
                            variant="outlined"
                            sx={{
                                borderRadius: '14px',
                                borderColor: '#e2e8f0',
                                maxHeight: 460,
                                overflowY: 'auto',
                                bgcolor: '#ffffff',
                                position: 'relative',
                            }}
                        >
                            <Table stickyHeader size="small">
                                <TableHead
                                    sx={{
                                        '& .MuiTableCell-stickyHeader': {
                                            backgroundColor: '#f8fafc !important',
                                            zIndex: 10,
                                            borderBottom: '2px solid #e2e8f0',
                                        },
                                    }}
                                >
                                    <TableRow>
                                        <TableCell width={44} sx={headCellStyles} />
                                        <TableCell align="center" width={50} sx={headCellStyles}>STT</TableCell>
                                        <TableCell sx={headCellStyles}>Nhà đài</TableCell>
                                        <TableCell sx={headCellStyles}>Dãy số</TableCell>
                                        <TableCell sx={headCellStyles}>Số lượng</TableCell>
                                        <TableCell align="center" sx={headCellStyles}>Trạng thái kho</TableCell>
                                        <TableCell align="center" sx={headCellStyles}>Tình trạng vé</TableCell>
                                        <TableCell align="right" sx={headCellStyles}>Giá bán niêm yết</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedTickets.map((ticketGroup, idx) => (
                                        <CollapsibleReturnTicketRow
                                            key={ticketGroup.ticketKey}
                                            ticketGroup={ticketGroup}
                                            index={idx}
                                            page={page}
                                            rowsPerPage={rowsPerPage}
                                        />
                                    ))}

                                    {groupedTickets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                                <Box
                                                    display="flex"
                                                    flexDirection="column"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    gap={1}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: '50%',
                                                            bgcolor: '#f1f5f9',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#94a3b8',
                                                        }}
                                                    >
                                                        <SearchOffOutlinedIcon fontSize="medium" />
                                                    </Box>
                                                    <Typography variant="subtitle2" fontWeight={700} color="#334155">
                                                        Không tìm thấy vé nào phù hợp
                                                    </Typography>
                                                    <Typography variant="caption" color="#94a3b8">
                                                        Thử tìm kiếm với từ khóa khác hoặc chuyển sang tab đài khác.
                                                    </Typography>
                                                    {searchQuery && (
                                                        <Button
                                                            size="small"
                                                            variant="text"
                                                            onClick={() => setSearchQuery('')}
                                                            sx={{ textTransform: 'none', fontWeight: 700, mt: 0.5, color: '#2563eb' }}
                                                        >
                                                            Xóa tìm kiếm
                                                        </Button>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {/* Pagination */}
                    {(inspectableData?.pagination?.totalRecords || 0) > 0 && (
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 20, 50]}
                            component="div"
                            count={inspectableData?.pagination?.totalRecords || 0}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            labelRowsPerPage="Số dòng mỗi trang:"
                            labelDisplayedRows={({ from, to, count }) =>
                                `${from}–${to} trong tổng ${count !== -1 ? count : `hơn ${to}`} dãy số`
                            }
                            sx={{
                                borderTop: '1px solid #f1f5f9',
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: '#64748b',
                                },
                            }}
                        />
                    )}
                </Stack>
            </DialogContent>

            {/* Footer with summary and close button */}
            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    bgcolor: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Trang hiện tại có <strong>{filteredSerials.length}</strong> vé sê-ri ({groupedTickets.length} dãy số)
                </Typography>

                <Button
                    variant="contained"
                    onClick={onClose}
                    sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 3,
                        py: 0.75,
                        bgcolor: '#0f172a',
                        color: '#ffffff',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#1e293b', boxShadow: 'none' },
                    }}
                >
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
