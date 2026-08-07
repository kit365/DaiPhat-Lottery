"use client";

import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import {
    Box,
    Button,
    Divider,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import type { ImportBatchLine, ImportBatchStatus } from '../../../import-batch/types/importBatch.type';
import {
    getBatchTypeLabel,
    getImportBatchLineStatusBadgeClass,
    getImportBatchLineStatusLabel,
} from '../../../import-batch/utils/batchTypeLabels';
import {
    displayImportBatchLineCodeRaw,
    formatImportBatchLineCode,
    importBatchCodeMonospaceSx,
} from '../../../import-batch/utils/importBatchCode';
import {
    getLineImportProgress,
    getLineStationColor,
    isLineCancelled,
    isLinePaused,
} from '../../../import-batch/utils/importBatchProgress';
import { TicketImportProgressTrack } from '../../../import-batch/components/sections/TicketImportProgressTrack';

type ImportBatchLineImportTableProps = {
    lines: ImportBatchLine[];
    batchStatus: ImportBatchStatus;
    drawDate?: string;
    resolveStationName: (stationId?: number | string) => string;
    onImportLine: (lineId: string) => void;
};

const canImportLine = (line: ImportBatchLine, batchStatus: ImportBatchStatus) => {
    const progress = getLineImportProgress(line);
    return (
        (batchStatus === 'DRAFT' ||
            batchStatus === 'RECEIVING' ||
            batchStatus === 'PARTIALLY_IMPORTED') &&
        !progress.isComplete &&
        !isLineCancelled(line) &&
        !isLinePaused(line)
    );
};

export const ImportBatchLineImportTable = ({
    lines,
    batchStatus,
    drawDate,
    resolveStationName,
    onImportLine,
}: ImportBatchLineImportTableProps) => {
    const drawDateLabel = drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—';

    return (
        <Box>
            <Divider sx={{ my: 2, borderColor: 'var(--palette-divider)' }} />

            <Typography className="admin-form-title" sx={{ fontSize: '1rem !important', mb: 0.5 }}>
                Danh sách nhà đài
            </Typography>
            <Typography className="admin-form-helper" sx={{ mb: 2, display: 'block' }}>
                Chọn nhà đài và bấm <strong>Nhập</strong> để mở form nhập vé từng dãy số.
            </Typography>

            <TableContainer className="admin-table-container">
                    <Table className="admin-table" sx={{ minWidth: 880 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nhà đài</TableCell>
                                <TableCell>Loại lô</TableCell>
                                <TableCell>Mã lô</TableCell>
                                <TableCell>Ngày quay</TableCell>
                                <TableCell align="center" sx={{ minWidth: 148 }}>
                                    Tiến độ
                                </TableCell>
                                <TableCell align="center">Trạng thái</TableCell>
                                <TableCell align="center" sx={{ width: 120 }}>
                                    Thao tác
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line) => {
                                const progress = getLineImportProgress(line);
                                const stationColor = getLineStationColor(lines, line);
                                const stationName = resolveStationName(line.lotteryStationId);
                                const importable = canImportLine(line, batchStatus);
                                const cancelled = isLineCancelled(line);
                                const paused = isLinePaused(line);
                                const batchCodeRaw = displayImportBatchLineCodeRaw(line.batchCode);
                                const batchCodeFormatted = line.batchCode
                                    ? formatImportBatchLineCode(line.batchCode)
                                    : undefined;

                                return (
                                    <TableRow key={line.id} hover={!cancelled}>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        bgcolor: stationColor.main,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <span className="admin-cell-title">{stationName}</span>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <span className="admin-cell-text">
                                                {getBatchTypeLabel(line.batchType)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {batchCodeRaw ? (
                                                <Tooltip title={batchCodeFormatted}>
                                                    <Typography
                                                        className="admin-cell-text"
                                                        noWrap
                                                        sx={{
                                                            ...importBatchCodeMonospaceSx,
                                                            maxWidth: 160,
                                                        }}
                                                    >
                                                        {batchCodeRaw}
                                                    </Typography>
                                                </Tooltip>
                                            ) : (
                                                <span className="admin-cell-text">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="admin-cell-text">{drawDateLabel}</span>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ minWidth: 132, maxWidth: 160, mx: 'auto' }}>
                                                <TicketImportProgressTrack
                                                    imported={progress.imported}
                                                    declared={progress.declared}
                                                    color={stationColor.main}
                                                    trackColor={stationColor.track}
                                                    ariaLabel={`Tiến độ nhập vé ${stationName}`}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <span
                                                className={`admin-status-badge ${getImportBatchLineStatusBadgeClass(line.status)}`}
                                            >
                                                {getImportBatchLineStatusLabel(line.status)}
                                            </span>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                disabled={cancelled}
                                                className={[
                                                    'import-batch-line-table-action',
                                                    importable ? 'import-batch-import-cta' : 'btn-outlined-admin',
                                                ].join(' ')}
                                                startIcon={
                                                    <ConfirmationNumberOutlinedIcon
                                                        className={
                                                            importable
                                                                ? 'import-batch-import-cta__ticket'
                                                                : undefined
                                                        }
                                                        sx={{ fontSize: '0.9375rem !important' }}
                                                    />
                                                }
                                                onClick={() => onImportLine(String(line.id))}
                                            >
                                                {importable
                                                    ? 'Nhập'
                                                    : progress.isComplete
                                                      ? 'Đã đủ'
                                                      : paused
                                                        ? 'Tạm dừng'
                                                        : 'Xem'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
        </Box>
    );
};
