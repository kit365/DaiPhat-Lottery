import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useInspectableReturnSerials } from '../../hooks/useReturnBatch';
import type { ReturnBatchLine } from '../../types/returnBatch.type';

interface Props {
    open: boolean;
    batchId: number;
    supplierName?: string | null;
    drawDate?: string | null;
    lines?: ReturnBatchLine[];
    initialStationName?: string | null;
    onClose: () => void;
}

const CollapsibleReturnTicketRow = ({
    ticketGroup,
    index,
    page,
    rowsPerPage,
}: {
    ticketGroup: {
        ticketKey: string;
        lotteryStationName: string;
        ticketNumbers: string;
        ticketPrice: number;
        importCost: number;
        serials: any[];
    };
    index: number;
    page: number;
    rowsPerPage: number;
}) => {
    const [open, setOpen] = useState(false);
    const firstSerial = ticketGroup.serials[0];
    const statusLabel = firstSerial?.statusLabel || firstSerial?.status || 'Trong kho';
    const conditionLabel =
        firstSerial?.ticketConditionDisplayName ||
        (firstSerial?.ticketCondition === 'GOOD' || !firstSerial?.ticketCondition ? 'Tốt' : firstSerial?.ticketCondition || 'Tốt');

    return (
        <React.Fragment>
            <TableRow
                sx={{
                    '& > *': { borderBottom: 'unset' },
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#F8FAFC' },
                    transition: 'background-color 0.15s ease',
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
                <TableCell align="center" sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                        {page * rowsPerPage + index + 1}
                    </Typography>
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
                        label={statusLabel}
                        size="small"
                        color={
                            firstSerial?.status === 'IN_STOCK' || !firstSerial?.status
                                ? 'success'
                                : firstSerial?.status === 'SOLD'
                                  ? 'info'
                                  : 'warning'
                        }
                        variant={firstSerial?.status === 'IN_STOCK' || !firstSerial?.status ? 'outlined' : 'filled'}
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                    />
                </TableCell>
                <TableCell align="center" sx={{ py: 1.5 }}>
                    <Chip
                        label={conditionLabel}
                        size="small"
                        variant="outlined"
                        color="success"
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
                ticketGroup.serials.map((s: any, sIndex: number) => {
                    const isDamaged =
                        s.ticketCondition &&
                        s.ticketCondition !== 'NORMAL' &&
                        s.ticketCondition !== 'GOOD';

                    return (
                        <TableRow
                            key={s.serialId || s.id || sIndex}
                            sx={{
                                bgcolor: '#F8FAFC',
                                '&:hover': { bgcolor: '#F1F5F9' },
                                transition: 'background-color 0.15s ease',
                            }}
                        >
                            <TableCell sx={{ width: 40, py: 1 }} />
                            <TableCell align="center" sx={{ py: 1 }}>
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    {`${page * rowsPerPage + index + 1}.${sIndex + 1}`}
                                </Typography>
                            </TableCell>
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
                                    label={s.statusLabel || s.status || 'Trong kho'}
                                    size="small"
                                    color={
                                        s.status === 'IN_STOCK' || !s.status
                                            ? 'success'
                                            : s.status === 'SOLD'
                                              ? 'info'
                                              : 'warning'
                                    }
                                    variant={s.status === 'IN_STOCK' || !s.status ? 'outlined' : 'filled'}
                                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                                <Chip
                                    label={
                                        s.ticketConditionDisplayName ||
                                        (s.ticketCondition === 'GOOD' || !s.ticketCondition
                                            ? 'Tốt'
                                            : s.ticketCondition || 'Tốt')
                                    }
                                    size="small"
                                    variant="outlined"
                                    color={isDamaged ? 'error' : 'success'}
                                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                    {s.ticketPrice ? `${formatImportCost(s.ticketPrice)} VNĐ` : `${formatImportCost(ticketGroup.ticketPrice)} VNĐ`}
                                </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>
                                <Typography variant="body2" fontWeight={600} color="#0F172A">
                                    {s.importCost ? `${formatImportCost(s.importCost)} VNĐ` : `${formatImportCost(ticketGroup.importCost)} VNĐ`}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    );
                })}
        </React.Fragment>
    );
};

export const ReturnBatchTicketsModal = ({
    open,
    batchId,
    supplierName,
    drawDate,
    lines = [],
    initialStationName,
    onClose,
}: Props) => {
    const { data: serials = [], isLoading } = useInspectableReturnSerials(batchId, open);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStationTab, setSelectedStationTab] = useState<string>('ALL');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Sync initial station tab when modal opens
    useEffect(() => {
        if (open) {
            setSelectedStationTab(initialStationName || 'ALL');
            setSearchQuery('');
            setPage(0);
        }
    }, [open, initialStationName]);

    // Unique station names from lines or serials
    const stationNames = useMemo(() => {
        const fromLines = lines
            .map((l) => l.lotteryStationName)
            .filter((name): name is string => Boolean(name));
        if (fromLines.length > 0) return Array.from(new Set(fromLines));

        const fromSerials = serials
            .map((s) => s.lotteryStationName)
            .filter((name): name is string => Boolean(name));
        return Array.from(new Set(fromSerials));
    }, [lines, serials]);

    // Filter serials by station tab and search query
    const filteredSerials = useMemo(() => {
        let result = serials;

        if (selectedStationTab !== 'ALL') {
            result = result.filter(
                (s) => (s.lotteryStationName || '').toLowerCase() === selectedStationTab.toLowerCase()
            );
        }

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter((s) => {
                const serialNum = (s.serialNumber || '').toLowerCase();
                const ticketNum = (s.ticketNumbers || '').toLowerCase();
                const station = (s.lotteryStationName || '').toLowerCase();
                return serialNum.includes(q) || ticketNum.includes(q) || station.includes(q);
            });
        }

        return result;
    }, [serials, selectedStationTab, searchQuery]);

    // Group serials by ticket number & station name
    const groupedTickets = useMemo(() => {
        const groupMap = new Map<
            string,
            {
                ticketKey: string;
                lotteryStationName: string;
                ticketNumbers: string;
                ticketPrice: number;
                importCost: number;
                serials: typeof serials;
            }
        >();

        filteredSerials.forEach((item) => {
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
    }, [filteredSerials]);

    // Totals for filtered serials
    const totalCount = filteredSerials.length;

    const totalWholesalePrice = useMemo(() => {
        return filteredSerials.reduce((acc, item) => {
            const cost = Number(item.importCost) || 0;
            return acc + cost;
        }, 0);
    }, [filteredSerials]);

    const totalTicketPrice = useMemo(() => {
        return filteredSerials.reduce((acc, item) => {
            const price = Number(item.ticketPrice) || 0;
            return acc + price;
        }, 0);
    }, [filteredSerials]);

    // Paginated ticket groups
    const paginatedTickets = useMemo(() => {
        const start = page * rowsPerPage;
        return groupedTickets.slice(start, start + rowsPerPage);
    }, [groupedTickets, page, rowsPerPage]);

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <ConfirmationNumberIcon sx={{ color: 'primary.light', opacity: 0.9 }} />
                        <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '0.2px', fontSize: '1.15rem' }}>
                            Danh sách vé kiểm tra trả nhà cung cấp #{batchId}
                        </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5, fontSize: '0.825rem' }}>
                        {supplierName ? `NCC: ${supplierName}` : ''}
                        {supplierName && drawDate ? ' • ' : ''}
                        {drawDate ? `Ngày quay: ${dayjs(drawDate).format('DD/MM/YYYY')}` : ''}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 2.5, bgcolor: '#FFFFFF' }}>
                <Stack spacing={2.5}>
                    {/* Top Summary Cards */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                            gap: 2,
                        }}
                    >
                        <Paper
                            variant="outlined"
                            sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: '#E2E8F0' }}
                        >
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                Số lượng vé (Sê-ri)
                            </Typography>
                            <Typography variant="h6" fontWeight={700} color="#0284C7">
                                {totalCount} vé
                            </Typography>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: '#E2E8F0' }}
                        >
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                Tổng giá vốn
                            </Typography>
                            <Typography variant="h6" fontWeight={700} color="#FF3030">
                                {formatImportCost(totalWholesalePrice)} VNĐ
                            </Typography>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: '#E2E8F0' }}
                        >
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                Tổng giá bán dự kiến
                            </Typography>
                            <Typography variant="h6" fontWeight={700} color="#7635DC">
                                {formatImportCost(totalTicketPrice)} VNĐ
                            </Typography>
                        </Paper>
                    </Box>

                    {/* Controls: Search and Station Tabs */}
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: 'stretch', md: 'center' }}
                    >
                        <TextField
                            placeholder="Tìm kiếm mã sê-ri, số vé, nhà đài..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(0);
                            }}
                            size="small"
                            sx={{ minWidth: { md: 320 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {stationNames.length > 0 && (
                            <Tabs
                                value={selectedStationTab}
                                onChange={(_, newValue) => {
                                    setSelectedStationTab(newValue);
                                    setPage(0);
                                }}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{
                                    minHeight: 40,
                                    '& .MuiTab-root': {
                                        minHeight: 40,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        fontSize: '0.875rem',
                                    },
                                }}
                            >
                                <Tab label={`Tất cả (${serials.length})`} value="ALL" />
                                {stationNames.map((stName) => {
                                    const stCount = serials.filter(
                                        (s) =>
                                            (s.lotteryStationName || '').toLowerCase() ===
                                            stName.toLowerCase()
                                    ).length;
                                    return (
                                        <Tab
                                            key={stName}
                                            label={`${stName} (${stCount})`}
                                            value={stName}
                                        />
                                    );
                                })}
                            </Tabs>
                        )}
                    </Stack>

                    {/* Main Table */}
                    {isLoading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : (
                        <TableContainer
                            component={Paper}
                            variant="outlined"
                            sx={{ borderRadius: 2, borderColor: '#E2E8F0', maxHeight: 440 }}
                        >
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { bgcolor: '#F1F5F9', fontWeight: 700 } }}>
                                        <TableCell width={40} />
                                        <TableCell align="center" width={50}>
                                            STT
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
                                            <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">
                                                    Không tìm thấy vé nào phù hợp.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        component="div"
                        count={groupedTickets.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Số dòng mỗi trang:"
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} trong ${count !== -1 ? count : `hơn ${to}`}`
                        }
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                <Button variant="outlined" color="inherit" onClick={onClose}>
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
