"use client";

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import {
    Box,
    Button,
    Chip,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import type { ImportBatch, ImportBatchFileGroup, ImportBatchLine } from '../../types/importBatch.type';
import { getImportBatchStatusLabel } from '../../utils/batchTypeLabels';
import { formatImportBatchHeaderCode } from '../../utils/importBatchCode';

export type FileAllocationRow = {
    stationId: number;
    stationName: string;
    line: ImportBatchLine | null;
    fileSerials: number;
    remaining: number;
    issue: 'MISSING' | 'EXCEEDED' | 'COMPLETED' | null;
};

export const buildFileAllocationRows = (
    batch: ImportBatch | null,
    group: ImportBatchFileGroup | undefined,
    stationNames: Record<number, string>
): FileAllocationRow[] => {
    if (!batch) return [];

    const lines = (batch.lines ?? []).filter((line) => line.status !== 'CANCELLED');
    const fileStations = group?.stations ?? [];
    const fileByStation = new Map(fileStations.map((station) => [station.lotteryStationId, station]));
    const stationIds = [
        ...new Set([
            ...fileStations.map((station) => station.lotteryStationId),
            ...lines.map((line) => line.lotteryStationId),
        ]),
    ];

    return stationIds.map((stationId) => {
        const fileStation = fileByStation.get(stationId);
        const openLine = lines.find((item) => item.lotteryStationId === stationId && item.status !== 'IMPORTED') ?? null;
        const line = openLine ?? lines.find((item) => item.lotteryStationId === stationId) ?? null;
        const fileSerials = fileStation?.serialCount ?? 0;
        const remaining = openLine
            ? Math.max(0, (openLine.declareQuantity ?? 0) - (openLine.totalQuantity ?? 0))
            : 0;
        const issue = fileSerials <= 0
            ? null
            : !line
              ? 'MISSING'
              : !openLine
                ? 'COMPLETED'
                : fileSerials > remaining
                  ? 'EXCEEDED'
                  : null;

        return {
            stationId,
            stationName: fileStation?.stationName || stationNames[stationId] || `Đài #${stationId}`,
            line,
            fileSerials,
            remaining,
            issue,
        };
    });
};

const formatQuantity = (value: number) => value.toLocaleString('vi-VN');

export const ImportBatchFileAllocationSummary = ({
    batch,
    supplierName,
    rows,
    onEdit,
    onExport,
}: {
    batch: ImportBatch;
    supplierName: string;
    rows: FileAllocationRow[];
    onEdit: () => void;
    onExport: () => void;
}) => {
    const issueCount = rows.filter((row) => row.issue).length;
    const activeLinesCount = (batch.lines ?? []).filter((line) => line.status !== 'CANCELLED').length;

    return (
        <Paper
            elevation={0}
            sx={{
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                overflow: 'hidden',
                bgcolor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
                gap={2}
                sx={{ px: 2.5, py: 1.75, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
            >
                <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.25}>
                    <Chip
                        size="small"
                        label={formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                        sx={{
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            bgcolor: '#2563eb',
                            color: '#ffffff',
                            borderRadius: '6px',
                        }}
                    />
                    <Chip
                        size="small"
                        color="info"
                        variant="outlined"
                        label={getImportBatchStatusLabel(batch.status)}
                        sx={{ height: 24, fontWeight: 700, fontSize: '0.75rem' }}
                    />
                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                        {supplierName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
                        <CalendarTodayOutlinedIcon sx={{ fontSize: '0.875rem' }} />
                        <Typography variant="body2" color="#475569" fontWeight={600}>
                            {dayjs(batch.drawDate).format('DD/MM/YYYY')}
                        </Typography>
                    </Box>
                    <Chip
                        size="small"
                        label={`${activeLinesCount} dòng đài`}
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569' }}
                    />
                </Stack>

                <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FactCheckOutlinedIcon />}
                        onClick={onExport}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                            borderColor: '#cbd5e1',
                            color: '#334155',
                            bgcolor: '#ffffff',
                        }}
                    >
                        Xuất đối chiếu
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<EditOutlinedIcon />}
                        onClick={onEdit}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                        }}
                    >
                        Chỉnh sửa phân bổ
                    </Button>
                </Stack>
            </Stack>

            {issueCount > 0 && (
                <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                    <Typography variant="body2" fontWeight={700} color="#9a3412">
                        {issueCount} nhà đài chưa đủ điều kiện nhập vé. Vui lòng chỉnh sửa phân bổ trước khi nạp vé.
                    </Typography>
                </Box>
            )}

            <TableContainer sx={{ maxHeight: 280 }}>
                <Table
                    size="small"
                    stickyHeader
                    aria-label="Đối chiếu số vé trong tệp với dòng phiếu nhập"
                    sx={{
                        '& .MuiTableCell-root': {
                            py: 1,
                            px: 1.5,
                            fontSize: '0.8125rem',
                            borderColor: '#f1f5f9',
                        },
                        '& .MuiTableHead-root .MuiTableCell-root': {
                            py: 0.85,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: '#64748b',
                            bgcolor: '#f8fafc',
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>Nhà đài</TableCell>
                            <TableCell align="right">Sê-ri trong tệp</TableCell>
                            <TableCell align="right">Đã nhập</TableCell>
                            <TableCell align="right">Phân bổ</TableCell>
                            <TableCell align="right">Còn nhận</TableCell>
                            <TableCell align="center">Đối chiếu</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.stationId} hover sx={row.issue ? { bgcolor: '#fffaf5' } : undefined}>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <Box
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            px: 1,
                                            py: 0.35,
                                            borderRadius: '6px',
                                            bgcolor: 'rgba(37, 99, 235, 0.08)',
                                            border: '1px solid rgba(37, 99, 235, 0.2)',
                                            color: '#1d4ed8',
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {row.stationName}
                                    </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                    {formatQuantity(row.fileSerials)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>
                                    {formatQuantity(row.line?.totalQuantity ?? 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>
                                    {row.line ? formatQuantity(row.line.declareQuantity) : '—'}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: row.remaining > 0 ? '#16a34a' : '#64748b' }}>
                                    {formatQuantity(row.remaining)}
                                </TableCell>
                                <TableCell align="center">
                                    <Chip
                                        size="small"
                                        color={row.issue ? 'warning' : row.fileSerials > 0 ? 'success' : 'default'}
                                        label={
                                            row.issue === 'MISSING' ? 'Thiếu đài trên phiếu'
                                                : row.issue === 'COMPLETED' ? 'Dòng đã hoàn tất'
                                                    : row.issue === 'EXCEEDED' ? `Vượt ${formatQuantity(row.fileSerials - row.remaining)} vé`
                                                        : row.fileSerials > 0 ? 'Đủ chỗ' : 'Không có vé trong tệp'
                                        }
                                        sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};
