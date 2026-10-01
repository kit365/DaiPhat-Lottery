"use client";

import { useMemo, useState } from 'react';
import {
    Box,
    Chip,
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
import SearchIcon from '@mui/icons-material/Search';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import dayjs from 'dayjs';
import type { ImportBatchFileRow, ImportBatchFileMapping } from '../../types/importBatch.type';

export interface SkippedTicketItem {
    rowNumber: number;
    stationName?: string;
    drawDate?: string;
    numbers?: string;
    serials?: string[];
    quantity: number;
    reason: string;
    type: 'MERGED' | 'OUT_OF_WINDOW' | 'OTHER';
    mergedIntoRowNumber?: number | null;
}

export const extractSkippedTicketItem = (
    row: ImportBatchFileRow,
    mapping?: ImportBatchFileMapping | null,
    groupDrawDate?: string
): SkippedTicketItem => {
    const stationColumn = mapping?.stationColumn ?? '';
    const numbersColumn = mapping?.numbersColumn ?? '';
    const serialsColumn = mapping?.serialsColumn ?? '';

    const rawValues = row.rawValues ?? {};
    const stationName = (row.stationName || rawValues[stationColumn] || '—').trim();
    const numbers = (row.numbers || rawValues[numbersColumn] || '—').trim();

    let serials = row.serialNumbers ?? [];
    if (serials.length === 0 && rawValues[serialsColumn]) {
        serials = rawValues[serialsColumn].split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    }

    const quantity = row.serialCount ?? row.declareQuantity ?? (serials.length > 0 ? serials.length : 1);
    const drawDate = row.drawDate || groupDrawDate;

    let reason = '';
    let type: SkippedTicketItem['type'] = 'OTHER';

    if (row.mergedIntoRowNumber != null) {
        type = 'MERGED';
        const mergeIssue = row.issues?.find((i) => i.code === 'NUMBERS_MERGED_INTO_ROW');
        reason = mergeIssue?.message || `Dãy số đã có ở dòng #${row.mergedIntoRowNumber}. Sê-ri dòng này được gộp vào dòng đó.`;
    } else if (row.issues?.some((i) => i.code === 'DRAW_DATE_OUT_OF_WINDOW' || i.severity === 'SKIPPED')) {
        type = 'OUT_OF_WINDOW';
        const dateIssue = row.issues.find((i) => i.code === 'DRAW_DATE_OUT_OF_WINDOW');
        reason = dateIssue?.message || 'Ngày quay của dòng này nằm ngoài phạm vi kỳ quay được phép nạp.';
    } else if (row.issues && row.issues.length > 0) {
        reason = row.issues.map((i) => i.message).filter(Boolean).join('; ');
    } else {
        reason = 'Dòng dữ liệu bị bỏ qua khi xử lý tệp.';
    }

    return {
        rowNumber: row.rowNumber,
        stationName,
        drawDate,
        numbers,
        serials,
        quantity,
        reason,
        type,
        mergedIntoRowNumber: row.mergedIntoRowNumber,
    };
};

export interface SkippedTicketsTableProps {
    rows: ImportBatchFileRow[];
    mapping?: ImportBatchFileMapping | null;
    groupDrawDate?: string;
    maxHeight?: number | string;
    hideSearch?: boolean;
}

export const SkippedTicketsTable = ({
    rows,
    mapping,
    groupDrawDate,
    maxHeight = 440,
    hideSearch = false,
}: SkippedTicketsTableProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const items: SkippedTicketItem[] = useMemo(() => {
        return rows.map((r) => extractSkippedTicketItem(r, mapping, groupDrawDate));
    }, [rows, mapping, groupDrawDate]);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) {
            return items;
        }
        const q = searchQuery.toLowerCase().trim();
        return items.filter((item) => {
            return (
                item.rowNumber.toString().includes(q) ||
                (item.stationName && item.stationName.toLowerCase().includes(q)) ||
                (item.numbers && item.numbers.toLowerCase().includes(q)) ||
                item.serials?.some((s) => s.toLowerCase().includes(q)) ||
                item.reason.toLowerCase().includes(q)
            );
        });
    }, [items, searchQuery]);

    const paginatedItems = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredItems.slice(start, start + rowsPerPage);
    }, [filteredItems, page, rowsPerPage]);

    const formatDate = (val?: string) => (val ? dayjs(val).format('DD/MM/YYYY') : '—');

    const mergedCount = useMemo(() => items.filter((i) => i.type === 'MERGED').length, [items]);
    const outOfWindowCount = useMemo(() => items.filter((i) => i.type === 'OUT_OF_WINDOW').length, [items]);

    return (
        <Paper
            elevation={0}
            sx={{
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                bgcolor: '#fff',
                overflow: 'hidden',
                mt: 1.5,
            }}
        >
            {/* Header toolbar */}
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: '#fff7ed',
                    borderBottom: '1px solid #fed7aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.5,
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2" fontWeight={800} color="#c2410c">
                        Danh sách vé bị bỏ qua ({items.length})
                    </Typography>
                    {mergedCount > 0 && (
                        <Chip
                            size="small"
                            icon={<MergeTypeIcon sx={{ fontSize: '0.95rem !important' }} />}
                            label={`${mergedCount} dòng đã gộp sê-ri`}
                            sx={{ height: 22, fontSize: '0.725rem', bgcolor: '#ffedd5', color: '#9a3412', fontWeight: 600 }}
                        />
                    )}
                    {outOfWindowCount > 0 && (
                        <Chip
                            size="small"
                            icon={<EventBusyOutlinedIcon sx={{ fontSize: '0.95rem !important' }} />}
                            label={`${outOfWindowCount} ngoài hạn quay`}
                            sx={{ height: 22, fontSize: '0.725rem', bgcolor: '#ffedd5', color: '#9a3412', fontWeight: 600 }}
                        />
                    )}
                </Stack>

                {!hideSearch && (
                    <TextField
                        size="small"
                        placeholder="Tìm theo dòng, đài, số, sê-ri..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(0);
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: '1rem', color: '#94a3b8' }} />
                                </InputAdornment>
                            ),
                            sx: {
                                height: 32,
                                fontSize: '0.8125rem',
                                bgcolor: '#ffffff',
                                borderRadius: '8px',
                            },
                        }}
                        sx={{ width: { xs: '100%', sm: 260 } }}
                    />
                )}
            </Box>

            {/* Table */}
            <TableContainer sx={{ maxHeight, overflowY: 'auto' }}>
                <Table size="small" stickyHeader sx={{ '--TableCell-stickyHeader-background': '#fffaf5' }}>
                    <TableHead
                        sx={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10,
                            '& .MuiTableCell-head, & .MuiTableCell-stickyHeader': {
                                fontWeight: 800,
                                fontSize: '0.725rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: '#475569',
                                bgcolor: '#fffaf5 !important',
                                backgroundColor: '#fffaf5 !important',
                                borderBottom: '1px solid #fed7aa',
                                py: 1,
                            },
                        }}
                    >
                        <TableRow>
                            <TableCell sx={{ width: 70 }}>Dòng #</TableCell>
                            <TableCell sx={{ width: 140 }}>Nhà đài</TableCell>
                            <TableCell sx={{ width: 110 }}>Ngày quay</TableCell>
                            <TableCell sx={{ width: 120 }}>Dãy số</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Sê-ri</TableCell>
                            <TableCell align="right" sx={{ width: 75 }}>SL vé</TableCell>
                            <TableCell sx={{ width: 110 }}>Phân loại</TableCell>
                            <TableCell sx={{ minWidth: 240 }}>Lý do bỏ qua / xử lý</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#64748b' }}>
                                    Không có vé nào phù hợp với điều kiện tìm kiếm.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((item) => (
                                <TableRow
                                    key={item.rowNumber}
                                    hover
                                    sx={{
                                        '&:nth-of-type(even)': { bgcolor: '#fafaf9' },
                                        '& .MuiTableCell-body': {
                                            py: 0.9,
                                            px: 1.5,
                                            fontSize: '0.8125rem',
                                            borderColor: '#f1f5f9',
                                        },
                                    }}
                                >
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={`#${item.rowNumber}`}
                                            sx={{
                                                height: 22,
                                                fontSize: '0.725rem',
                                                fontWeight: 700,
                                                fontFamily: 'monospace',
                                                bgcolor: '#f1f5f9',
                                                color: '#334155',
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                                        {item.stationName}
                                    </TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: '0.775rem' }}>
                                        {formatDate(item.drawDate)}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                                        {item.numbers}
                                    </TableCell>
                                    <TableCell>
                                        {item.serials && item.serials.length > 0 ? (
                                            <Tooltip title={item.serials.join(', ')}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 1,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        color: '#475569',
                                                        bgcolor: '#f8fafc',
                                                        px: 0.75,
                                                        py: 0.25,
                                                        borderRadius: '4px',
                                                        border: '1px solid #e2e8f0',
                                                        maxWidth: 220,
                                                    }}
                                                >
                                                    {item.serials.join(', ')}
                                                </Typography>
                                            </Tooltip>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        {item.quantity}
                                    </TableCell>
                                    <TableCell>
                                        {item.type === 'MERGED' ? (
                                            <Chip
                                                size="small"
                                                icon={<MergeTypeIcon sx={{ fontSize: '0.875rem !important' }} />}
                                                label="Đã gộp"
                                                color="info"
                                                variant="outlined"
                                                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                            />
                                        ) : item.type === 'OUT_OF_WINDOW' ? (
                                            <Chip
                                                size="small"
                                                icon={<EventBusyOutlinedIcon sx={{ fontSize: '0.875rem !important' }} />}
                                                label="Ngoài hạn"
                                                color="warning"
                                                variant="outlined"
                                                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                            />
                                        ) : (
                                            <Chip
                                                size="small"
                                                icon={<InfoOutlinedIcon sx={{ fontSize: '0.875rem !important' }} />}
                                                label="Bỏ qua"
                                                variant="outlined"
                                                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: '0.775rem' }}>
                                        {item.reason}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            {filteredItems.length > 0 && (
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={filteredItems.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage="Dòng/trang:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} trên ${count}`}
                    sx={{
                        borderTop: '1px solid #f1f5f9',
                        '& .MuiTablePagination-toolbar': { minHeight: 44, px: 2 },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: '0.75rem',
                        },
                    }}
                />
            )}
        </Paper>
    );
};
