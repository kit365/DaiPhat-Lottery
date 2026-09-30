"use client";

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
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
import { getImportBatchStatusLabel, getImportModeLabel } from '../../utils/batchTypeLabels';
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

    return (
        <Paper elevation={0} sx={{ border: '1px solid #dbe4f0', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                gap={1.5}
                sx={{ px: 2.5, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
            >
                <Box>
                    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            Phiếu nhập lô · {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                        </Typography>
                        <Chip size="small" color="info" variant="outlined" label={getImportBatchStatusLabel(batch.status)} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        {supplierName} · Ngày quay sẽ nhập: {dayjs(batch.drawDate).format('DD/MM/YYYY')} · {getImportModeLabel(batch.importMode)} · {(batch.lines ?? []).filter((line) => line.status !== 'CANCELLED').length} dòng nhà đài
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Chỉ vé hợp lệ của ngày quay này được nhập vào phiếu. Các ngày khác trong tệp chỉ dùng để đối chiếu.
                    </Typography>
                </Box>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Button size="small" variant="outlined" startIcon={<FactCheckOutlinedIcon />} onClick={onExport} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Xuất đối chiếu
                    </Button>
                    <Button size="small" variant="contained" startIcon={<EditOutlinedIcon />} onClick={onEdit} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Chỉnh sửa phân bổ
                    </Button>
                </Stack>
            </Stack>

            {issueCount > 0 && (
                <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                    <Typography variant="body2" fontWeight={700} color="#9a3412">
                        {issueCount} nhà đài chưa đủ điều kiện nhập vé. Chỉnh sửa phân bổ trước khi tiếp tục.
                    </Typography>
                </Box>
            )}

            <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader aria-label="Đối chiếu số vé trong tệp với dòng phiếu nhập" sx={{ '--TableCell-stickyHeader-background': '#f8fafc' }}>
                    <TableHead
                        sx={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10,
                            '& .MuiTableCell-head, & .MuiTableCell-stickyHeader': {
                                backgroundColor: '#f8fafc !important',
                                bgcolor: '#f8fafc !important',
                                zIndex: 10,
                                fontWeight: 800,
                            },
                        }}
                    >
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Nhà đài</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Sê-ri trong tệp</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Đã nhập</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Phân bổ</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Còn nhận</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Đối chiếu</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.stationId} sx={row.issue ? { bgcolor: '#fffaf5' } : undefined}>
                                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{row.stationName}</TableCell>
                                <TableCell align="right">{formatQuantity(row.fileSerials)}</TableCell>
                                <TableCell align="right">{formatQuantity(row.line?.totalQuantity ?? 0)}</TableCell>
                                <TableCell align="right">{row.line ? formatQuantity(row.line.declareQuantity) : '—'}</TableCell>
                                <TableCell align="right">{formatQuantity(row.remaining)}</TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        color={row.issue ? 'warning' : row.fileSerials > 0 ? 'success' : 'default'}
                                        label={
                                            row.issue === 'MISSING' ? 'Thiếu đài trên phiếu'
                                                : row.issue === 'COMPLETED' ? 'Dòng đã hoàn tất'
                                                    : row.issue === 'EXCEEDED' ? `Vượt ${formatQuantity(row.fileSerials - row.remaining)} vé`
                                                        : row.fileSerials > 0 ? 'Đủ chỗ' : 'Không có vé trong tệp'
                                        }
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
