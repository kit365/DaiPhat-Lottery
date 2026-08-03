import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
import { useEffect, useMemo, useState } from 'react';
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

    // Paginated serials
    const paginatedSerials = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredSerials.slice(start, start + rowsPerPage);
    }, [filteredSerials, page, rowsPerPage]);

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
                    p: 2,
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #E2E8F0',
                    bgcolor: '#F8FAFC',
                }}
            >
                <Box>
                    <Typography variant="h6" fontWeight={700} color="#1E293B">
                        Danh sách vé kiểm tra trả nhà cung cấp #{batchId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {supplierName ? `NCC: ${supplierName}` : ''}
                        {supplierName && drawDate ? ' • ' : ''}
                        {drawDate ? `Ngày quay: ${dayjs(drawDate).format('DD/MM/YYYY')}` : ''}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
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
                            <Typography variant="h6" fontWeight={700} color="#00A76F">
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
                                        <TableCell align="center" width={60}>
                                            STT
                                        </TableCell>
                                        <TableCell>Mã sê-ri</TableCell>
                                        <TableCell>Số vé</TableCell>
                                        <TableCell>Nhà đài</TableCell>
                                        <TableCell align="center">Ngày quay</TableCell>
                                        <TableCell align="right">Giá vốn</TableCell>
                                        <TableCell align="right">Giá bán</TableCell>
                                        <TableCell align="center">Tình trạng vé</TableCell>
                                        <TableCell align="center">Trạng thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedSerials.map((serial, idx) => {
                                        const isDamaged =
                                            serial.ticketCondition &&
                                            serial.ticketCondition !== 'NORMAL' &&
                                            serial.ticketCondition !== 'GOOD';

                                        return (
                                            <TableRow key={serial.serialId} hover>
                                                <TableCell align="center">
                                                    {page * rowsPerPage + idx + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={700}
                                                        sx={{
                                                            fontFamily: 'monospace',
                                                            bgcolor: '#F8FAFC',
                                                            px: 1,
                                                            py: 0.25,
                                                            borderRadius: 1,
                                                            display: 'inline-block',
                                                            border: '1px solid #E2E8F0',
                                                        }}
                                                    >
                                                        {serial.serialNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {serial.ticketNumbers || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {serial.lotteryStationName || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        {serial.drawDate
                                                            ? dayjs(serial.drawDate).format('DD/MM/YYYY')
                                                            : '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {serial.importCost
                                                            ? `${formatImportCost(serial.importCost)} VNĐ`
                                                            : '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={600} color="#7635DC">
                                                        {serial.ticketPrice
                                                            ? `${formatImportCost(serial.ticketPrice)} VNĐ`
                                                            : '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={
                                                            serial.ticketConditionDisplayName ||
                                                            serial.ticketCondition ||
                                                            'Bình thường'
                                                        }
                                                        size="small"
                                                        color={isDamaged ? 'error' : 'success'}
                                                        variant={isDamaged ? 'filled' : 'outlined'}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={serial.statusLabel || serial.status || 'Tồn kho'}
                                                        size="small"
                                                        color="info"
                                                        variant="filled"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {filteredSerials.length === 0 && (
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
                        count={filteredSerials.length}
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
