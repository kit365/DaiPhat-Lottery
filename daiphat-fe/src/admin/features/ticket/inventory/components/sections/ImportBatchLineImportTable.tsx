"use client";

import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import {
    Box,
    Button,
    Divider,
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
    getBatchTypeBadgeClass,
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
    embedded?: boolean;
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
    embedded = false,
}: ImportBatchLineImportTableProps) => {
    const drawDateLabel = drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—';

    return (
        <Box>
            {!embedded && (
                <>
                    <Divider sx={{ my: 2, borderColor: 'var(--palette-divider)' }} />

                    <Typography className="admin-form-title" sx={{ fontSize: '1rem !important', mb: 0.5 }}>
                        Danh sách nhà đài
                    </Typography>
                    <Typography className="admin-form-helper" sx={{ mb: 2, display: 'block' }}>
                        Chọn nhà đài và bấm <strong>Nhập</strong> để mở form nhập vé từng dãy số.
                    </Typography>
                </>
            )}

            <Box className={embedded ? 'admin-import-batch-line-embed-inner' : undefined}>
            <TableContainer className="admin-table-container">
                    <Table
                        className={[
                            'admin-table',
                            embedded ? 'admin-import-batch-line-embed-table' : undefined,
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        sx={{ minWidth: embedded ? 720 : 880 }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Nhà đài</TableCell>
                                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>Loại lô</TableCell>
                                <TableCell sx={{ minWidth: embedded ? 200 : 220 }}>Mã lô</TableCell>
                                {!embedded && <TableCell>Ngày quay</TableCell>}
                                <TableCell align="center" sx={{ width: 100, minWidth: 100, maxWidth: 100 }}>
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
                                const stationName = resolveStationName(line.lotteryStationId);
                                const importable = canImportLine(line, batchStatus);
                                const cancelled = isLineCancelled(line);
                                const paused = isLinePaused(line);
                                const batchCodeRaw = displayImportBatchLineCodeRaw(line.batchCode);
                                const batchCodeFormatted = line.batchCode
                                    ? formatImportBatchLineCode(line.batchCode)
                                    : undefined;

                                return (
                                    <TableRow key={line.id} hover={!embedded && !cancelled}>
                                        <TableCell>
                                            <span className="admin-cell-title">{stationName}</span>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                <span
                                                    className={`admin-status-badge ${getBatchTypeBadgeClass(line.batchType)}`}
                                                >
                                                    {getBatchTypeLabel(line.batchType)}
                                                </span>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ minWidth: embedded ? 200 : 220 }}>
                                            {batchCodeRaw ? (
                                                <Tooltip title={batchCodeFormatted ?? batchCodeRaw}>
                                                    <Typography
                                                        component="span"
                                                        className="admin-cell-text"
                                                        sx={importBatchCodeMonospaceSx}
                                                    >
                                                        {batchCodeRaw}
                                                    </Typography>
                                                </Tooltip>
                                            ) : (
                                                <span className="admin-cell-text">—</span>
                                            )}
                                        </TableCell>
                                        {!embedded && (
                                            <TableCell>
                                                <span className="admin-cell-text">{drawDateLabel}</span>
                                            </TableCell>
                                        )}
                                        <TableCell align="center">
                                            <Box sx={{ width: 88, mx: 'auto' }}>
                                                <TicketImportProgressTrack
                                                    imported={progress.imported}
                                                    declared={progress.declared}
                                                    height={5}
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
        </Box>
    );
};
