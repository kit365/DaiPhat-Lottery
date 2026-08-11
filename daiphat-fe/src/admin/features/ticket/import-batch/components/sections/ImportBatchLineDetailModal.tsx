"use client";

'use client';

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Stack,
    CircularProgress,
    Grid,
    LinearProgress,
    Collapse,
    Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../inventory/constants/queryKeys';
import { LazyReportSerialFaultPane } from './LazyReportSerialFaultPane';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LabelIcon from '@mui/icons-material/Label';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import dayjs from 'dayjs';
import { ImportBatchLine, ImportBatch } from '../../types/importBatch.type';
import { useTicketInventory } from '../../../inventory/hooks/useTicketInventory';
import { isSerialIncidentEligible } from '../../utils/serialIncidentWorkflow';
import { getTicketStatusLabel, normalizeTicketStatus } from '../../../inventory/constants/ticket-status.config';
import { displayImportBatchLineCodeRaw, formatImportBatchHeaderCode } from '../../utils/importBatchCode';
import { getBatchTypeBadgeClass, getBatchTypeLabel, getImportBatchLineStatusChipColor, getImportBatchLineStatusLabel } from '../../utils/batchTypeLabels';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';

interface Props {
    line: ImportBatchLine;
    batch: ImportBatch;
    stationName: string;
    onClose: () => void;
}

const getTicketStatusBadgeClass = (status?: string | null): string => {
    const normalized = normalizeTicketStatus(status);
    switch (normalized) {
        // Ticket aggregate statuses
        case 'IN_STOCK':
            return 'admin-status-badge--active';
        case 'IMPORTING':
            return 'admin-status-badge--pending';
        case 'SOLD_OUT':
        case 'EXPIRED':
            return 'admin-status-badge--inactive';
        // Serial statuses (nested rows reuse this helper)
        case 'SOLD':
            return 'admin-status-badge--success';
        case 'RESERVED':
        case 'PROXY_HOLDING':
            return 'admin-status-badge--pending';
        case 'DAMAGED':
        case 'LOST':
        case 'VOIDED':
            return 'admin-status-badge--inactive';
        default:
            // Unknown / legacy cached values
            return 'admin-status-badge--draft';
    }
};

const getSerialDisplayBadge = (serial: {
    status?: string | null;
    statusDisplayName?: string | null;
    ticketCondition?: string | null;
    ticketConditionDisplayName?: string | null;
}) => {
    const condition = (serial.ticketCondition || '').toUpperCase();
    if (condition === 'DAMAGED' || condition === 'LOST' || condition === 'VOIDED') {
        return {
            className: getTicketStatusBadgeClass(condition),
            label:
                serial.ticketConditionDisplayName ||
                (condition === 'DAMAGED' ? 'Hỏng' : condition === 'LOST' ? 'Thất lạc' : 'Đã hủy'),
        };
    }
    return {
        className: getTicketStatusBadgeClass(serial.status),
        label: serial.statusDisplayName || getTicketStatusLabel(serial.status) || serial.status || '—',
    };
};

const CollapsibleRow = ({
    ticket,
    index,
    stationName,
    onReportFault,
}: {
    ticket: any;
    index: number;
    stationName: string;
    onReportFault: (ticket: any, serial?: any) => void;
}) => {
    const [open, setOpen] = React.useState(false);
    const statusLabel = ticket.statusDisplayName || getTicketStatusLabel(ticket.status) || ticket.status || '—';

    return (
        <React.Fragment>
            <TableRow 
                sx={{ 
                    '& > *': { borderBottom: 'unset' },
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8fafc' }, 
                    transition: 'background-color 0.15s ease'
                }}
                onClick={() => setOpen(!open)}
            >
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
                <TableCell sx={{ py: 1.5 }} align="center">
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                        {index + 1}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                        {stationName || '—'}
                    </Typography>
                </TableCell>
                <TableCell component="th" scope="row" sx={{ py: 1.5 }}>
                    <Typography 
                        variant="body1" 
                        fontWeight={800} 
                        color="primary.main" 
                        sx={{ 
                            letterSpacing: '1px', 
                            fontSize: '1.05rem',
                            fontFamily: 'monospace'
                        }}
                    >
                        {ticket.numbers}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {ticket.serials?.length ? `${ticket.serials.length} sê-ri` : '—'}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }} align="center">
                    <span className={`admin-status-badge ${getTicketStatusBadgeClass(ticket.status)}`.trim()}>
                        {statusLabel}
                    </span>
                </TableCell>
                <TableCell sx={{ py: 1.5 }} align="center">
                    <Chip
                        label="Tốt"
                        size="small"
                        variant="outlined"
                        color="success"
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                    />
                </TableCell>
                <TableCell sx={{ py: 1.5 }} align="right">
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        {Number(ticket.priceSnapshot || 10000).toLocaleString('vi-VN')} VNĐ
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }} align="right">
                    <Typography variant="body2" fontWeight={600} color="#0F172A">
                        {Number(ticket.importCostSnapshot || ticket.priceSnapshot || 10000).toLocaleString('vi-VN')} VNĐ
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }} align="center">
                    <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={(e) => {
                            e.stopPropagation();
                            onReportFault(ticket);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 600, py: 0.25, borderRadius: '4px' }}
                    >
                        Hủy vé
                    </Button>
                </TableCell>
            </TableRow>
            {open && ticket.serials && ticket.serials.length > 0 ? (
                ticket.serials.map((s: any, sIndex: number) => {
                    const serialBadge = getSerialDisplayBadge(s);
                    return (
                        <TableRow 
                            key={s.id} 
                            sx={{ 
                                bgcolor: '#f8fafc',
                                '&:hover': { bgcolor: '#f1f5f9' },
                                transition: 'background-color 0.15s ease',
                            }}
                        >
                            <TableCell sx={{ width: 40, py: 1 }} />
                            <TableCell align="center" sx={{ py: 1 }}>
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    {`${index + 1}.${sIndex + 1}`}
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {stationName || '—'}
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" fontWeight={600} color="text.secondary">
                                    {ticket.numbers}
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontFamily: 'monospace', 
                                        fontWeight: 600,
                                        color: '#334155',
                                        bgcolor: '#FFFFFF',
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 1,
                                        border: '1px solid #E2E8F0',
                                        display: 'inline-block'
                                    }}
                                >
                                    {s.serialNumber}
                                </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                                <span className={`admin-status-badge ${serialBadge.className}`.trim()} style={{ fontSize: '0.7rem', height: '1.25rem' }}>
                                    {serialBadge.label}
                                </span>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                                <Chip
                                    label={s.ticketCondition === 'GOOD' || !s.ticketCondition ? 'Tốt' : s.ticketCondition}
                                    size="small"
                                    variant="outlined"
                                    color={s.ticketCondition === 'GOOD' || !s.ticketCondition ? 'success' : 'warning'}
                                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                    {Number(s.ticketPrice ?? ticket.priceSnapshot ?? 10000).toLocaleString('vi-VN')} VNĐ
                                </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>
                                <Typography variant="body2" fontWeight={600} color="#0F172A">
                                    {Number(s.importCost ?? ticket.importCostSnapshot ?? ticket.priceSnapshot ?? 10000).toLocaleString('vi-VN')} VNĐ
                                </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReportFault(ticket, s);
                                    }}
                                    disabled={!isSerialIncidentEligible(s)}
                                    sx={{ textTransform: 'none', minWidth: 'unset', fontWeight: 600, py: 0.25, borderRadius: '4px' }}
                                >
                                    Hủy
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })
            ) : open ? (
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ width: 40, py: 1 }} />
                    <TableCell colSpan={9} sx={{ py: 2, px: 4, color: 'text.secondary', fontStyle: 'italic', fontSize: '0.825rem' }}>
                        Không có số sê-ri nào được gán
                    </TableCell>
                </TableRow>
            ) : null}
        </React.Fragment>
    );
};

export const ImportBatchLineDetailModal = ({ line, batch, stationName, onClose }: Props) => {
    const queryClient = useQueryClient();
    // Destructure tickets directly instead of data (since hook returns tickets mapped array)
    const { tickets, isLoading } = useTicketInventory({ importBatchLineId: line.id }, 1000);

    // States for report fault pane
    const [reportSerials, setReportSerials] = React.useState<any[]>([]);
    const [reportTicketNumbers, setReportTicketNumbers] = React.useState('');
    const [reportTicketId, setReportTicketId] = React.useState<number | string | undefined>(undefined);

    const handleOpenReportModal = (ticket: any, serial?: any) => {
        if (serial) {
            setReportSerials([{
                id: serial.id,
                serialNumber: serial.serialNumber,
                status: serial.status,
                ticketCondition: serial.ticketCondition,
                returnBatchLineId: serial.returnBatchLineId,
                ticketId: ticket.id,
                ticketNumbers: ticket.numbers,
                ticketStatus: ticket.status,
                reservedByOrderId: serial.reservedByOrderId,
            }]);
        } else {
            setReportSerials((ticket.serials || []).map((s: any) => ({
                id: s.id,
                serialNumber: s.serialNumber,
                status: s.status,
                ticketCondition: s.ticketCondition,
                returnBatchLineId: s.returnBatchLineId,
                ticketId: ticket.id,
                ticketNumbers: ticket.numbers,
                ticketStatus: ticket.status,
                reservedByOrderId: s.reservedByOrderId,
            })));
        }
        setReportTicketNumbers(ticket.numbers);
        setReportTicketId(ticket.id);
    };

    const handleCancelReport = () => {
        setReportSerials([]);
        setReportTicketNumbers('');
        setReportTicketId(undefined);
    };

    const handleReportSuccess = () => {
        setReportSerials([]);
        setReportTicketNumbers('');
        setReportTicketId(undefined);
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
    };

    const completionRate = line.declareQuantity > 0 
        ? Math.min(100, Math.round((line.totalQuantity / line.declareQuantity) * 100)) 
        : 0;

    return (
        <Dialog 
            open 
            maxWidth="xl" 
            fullWidth 
            onClose={onClose}
            PaperProps={{
                className: 'admin-theme',
                sx: {
                    borderRadius: 3,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                    height: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }
            }}
        >
            {/* Header with Sleek Style */}
            <DialogTitle 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    color: '#fff',
                    py: 2.5,
                    px: 3,
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <ConfirmationNumberIcon sx={{ color: 'primary.light', opacity: 0.9 }} />
                        <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '0.2px', fontSize: '1.15rem' }}>
                            Dòng Lô Nhập: {displayImportBatchLineCodeRaw(line.batchCode)}
                        </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5, fontSize: '0.825rem' }}>
                        Thuộc phiếu: {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                    <CloseIcon fontSize="medium" />
                </IconButton>
            </DialogTitle>

            <DialogContent 
                dividers 
                sx={{ 
                    p: 3, 
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflow: 'hidden'
                }}
            >
                <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0, width: '100%' }}>
                    {/* Left Pane (Details and List) */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '60%' }}>
                        {/* Unified Info Panel for Perfect Alignment */}
                        <Paper 
                            variant="outlined" 
                            sx={{ 
                                p: 3, 
                                borderRadius: 2, 
                                borderColor: '#e2e8f0', 
                                bgcolor: '#fff',
                                mb: 3.5,
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)'
                            }}
                        >
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Stack spacing={0.75}>
                                        <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                            <StorefrontIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                            <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Nhà đài
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ pl: 3 }}>
                                            {stationName}
                                        </Typography>
                                    </Stack>
                                </Grid>
                                
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Stack spacing={0.75}>
                                        <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                            <LabelIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                            <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Loại lô
                                            </Typography>
                                        </Stack>
                                        <Box sx={{ pl: 3 }}>
                                            <AdminStatusBadge
                                                label={getBatchTypeLabel(line.batchType)}
                                                modifier={getBatchTypeBadgeClass(line.batchType)}
                                            />
                                        </Box>
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Stack spacing={0.75}>
                                        <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                            <CheckCircleIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                            <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Trạng thái dòng
                                            </Typography>
                                        </Stack>
                                        <Box sx={{ pl: 3 }}>
                                            <Chip 
                                                label={getImportBatchLineStatusLabel(line.status)} 
                                                size="small" 
                                                color={getImportBatchLineStatusChipColor(line.status)}
                                                sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }} 
                                            />
                                        </Box>
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Stack spacing={0.75}>
                                        <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                            <CalendarMonthIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                            <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Lịch quay
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ pl: 3 }}>
                                            {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                        </Typography>
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Stack spacing={0.75}>
                                        <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                            <CloudUploadIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                            <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Ngày nhập
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ pl: 3 }}>
                                            {line.importedAt ? dayjs(line.importedAt).format('DD/MM/YYYY HH:mm') : '—'}
                                        </Typography>
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Stack spacing={0.75}>
                                        <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                            <ShowChartIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                            <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Tiến độ nhập
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pl: 3 }}>
                                            <Typography variant="body2" fontWeight={700} color="text.primary">
                                                {line.totalQuantity}/{line.declareQuantity} vé
                                            </Typography>
                                            <Box sx={{ width: 80, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: '100%' }}>
                                                    <LinearProgress 
                                                        variant="determinate" 
                                                        value={completionRate} 
                                                        color={completionRate === 100 ? 'success' : 'warning'} 
                                                        sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9' }}
                                                    />
                                                </Box>
                                                <Typography variant="caption" fontWeight={700} color={completionRate === 100 ? 'success.main' : 'warning.main'}>
                                                    {completionRate}%
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Main Data Section */}
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#334155', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <ConfirmationNumberIcon sx={{ fontSize: '1rem', color: '#475569' }} />
                            Danh sách vé và sê-ri vật lý ({tickets.length})
                        </Typography>

                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8, flexGrow: 1 }}>
                                <CircularProgress size={36} thickness={4} />
                            </Box>
                        ) : tickets.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#fff', flexGrow: 1 }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                    Không có vé số nào được tìm thấy trong dòng lô nhập này.
                                </Typography>
                            </Paper>
                        ) : (
                            <TableContainer 
                                component={Paper} 
                                variant="outlined" 
                                sx={{ 
                                    borderRadius: 2, 
                                    borderColor: '#e2e8f0', 
                                    boxShadow: 'none', 
                                    bgcolor: '#fff', 
                                    overflowY: 'auto',
                                    flex: 1,
                                    minHeight: 0
                                }}
                            >
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                        <TableRow>
                                            <TableCell sx={{ width: 40 }} />
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: '#475569', width: 50 }} align="center">STT</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: '#475569' }}>Nhà đài</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: '#475569' }}>Số vé</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: '#475569' }}>Sê-ri</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: '#475569' }} align="center">Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: '#475569' }} align="center">Tình trạng vé</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: '#475569' }} align="right">Giá bán</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: '#475569' }} align="right">Giá vốn</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: '#475569' }} align="center">Thao tác</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {tickets.map((ticket: any, index: number) => (
                                            <CollapsibleRow
                                                key={ticket.id}
                                                ticket={ticket}
                                                index={index}
                                                stationName={stationName}
                                                onReportFault={handleOpenReportModal}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {/* Right Pane (Fault Reporting) */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '40%' }}>
                        {reportSerials.length > 0 ? (
                            <LazyReportSerialFaultPane
                                serials={reportSerials}
                                ticketNumbers={reportTicketNumbers}
                                ticketId={reportTicketId}
                                importBatchLineId={line.id}
                                stationId={line.lotteryStationId}
                                drawDate={batch.drawDate}
                                onCancel={handleCancelReport}
                                onSuccess={handleReportSuccess}
                            />
                        ) : (
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 4,
                                    borderRadius: '20px',
                                    borderColor: '#cbd5e1',
                                    bgcolor: '#fff',
                                    height: '100%',
                                    minHeight: '400px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    boxShadow: 'none',
                                    border: '2px dashed #cbd5e1'
                                }}
                            >
                                <ReportProblemIcon sx={{ fontSize: '48px', color: '#94a3b8', mb: 2 }} />
                                <Typography variant="h6" fontWeight={700} color="#475569" sx={{ mb: 1 }}>
                                    Xử lý báo cáo hủy vé
                                </Typography>
                                <Typography variant="body2" color="#64748b" sx={{ maxWidth: '300px' }}>
                                    Vui lòng nhấn nút <strong>Hủy vé</strong> hoặc <strong>Hủy</strong> ở danh sách bên trái để mở bảng xử lý hủy sê-ri vật lý.
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
};
