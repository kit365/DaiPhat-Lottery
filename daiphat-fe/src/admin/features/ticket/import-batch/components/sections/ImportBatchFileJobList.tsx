"use client";

import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import {
    Box,
    Card,
    CircularProgress,
    IconButton,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useImportBatchFileJobs } from '../../hooks/useImportBatch';
import type { ImportBatchFileJob } from '../../types/importBatch.type';
import {
    getImportBatchFileJobStatusBadgeClass,
    getImportBatchFileJobStatusLabel,
} from '../../utils/batchTypeLabels';
import { IMPORT_BATCH_SLIP_LABEL } from '@/constants/ticketDisplay.constants';
import { dataGridContainerStyles } from '../../../../../shared/data-grid';

const formatDateTime = (value?: string) =>
    value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';

const formatDrawDates = (value?: string) => {
    if (!value) {
        return '—';
    }
    return value
        .split(',')
        .map((date) => dayjs(date.trim()).format('DD/MM/YYYY'))
        .join(', ');
};

const NUMERIC_COL_SX = {
    width: 92,
    minWidth: 92,
    maxWidth: 92,
    textAlign: 'center',
    whiteSpace: 'nowrap',
} as const;

/**
 * Every attempt to import a supplier file, newest first.
 */
export const ImportBatchFileJobList = () => {
    const { jobs, pagination, isLoading, page, size, setPage, setLimit } =
        useImportBatchFileJobs();

    const pageIndex = Math.max(0, page - 1);
    const totalRecords = pagination?.totalRecords ?? jobs.length;

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <Box sx={dataGridContainerStyles}>
                <TableContainer className="admin-table-container" sx={{ flex: 1, overflow: 'auto' }}>
                    <Table
                        className="admin-table"
                        sx={{
                            minWidth: 1080,
                            height: !isLoading && jobs.length === 0 ? '100%' : 'auto',
                        }}
                        size="medium"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Thời điểm</TableCell>
                                <TableCell>Tệp</TableCell>
                                <TableCell>Nhà cung cấp</TableCell>
                                <TableCell>Ngày quay</TableCell>
                                <TableCell align="center" sx={NUMERIC_COL_SX}>
                                    {IMPORT_BATCH_SLIP_LABEL}
                                </TableCell>
                                <TableCell align="center" sx={NUMERIC_COL_SX}>
                                    Khai báo
                                </TableCell>
                                <TableCell align="center" sx={NUMERIC_COL_SX}>
                                    Nhập được
                                </TableCell>
                                <TableCell align="center">Kết quả</TableCell>
                                <TableCell align="center" sx={{ width: 72 }}>
                                    Tệp gốc
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                minHeight: 320,
                                            }}
                                        >
                                            <CircularProgress size={32} />
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : jobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 0.75,
                                                minHeight: 320,
                                            }}
                                        >
                                            <Typography className="admin-datagrid-empty">
                                                Chưa có lần nhập nào từ tệp
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Lịch sử sẽ hiện ở đây sau khi bạn dùng nút &quot;Nhập từ tệp&quot;.
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                jobs.map((job: ImportBatchFileJob) => {
                                    const shortfall = job.importedQuantity < job.declaredQuantity;
                                    const statusLabel =
                                        job.statusLabel || getImportBatchFileJobStatusLabel(job.status);
                                    const statusBadge = (
                                        <span
                                            className={`admin-status-badge ${getImportBatchFileJobStatusBadgeClass(job.status)}`}
                                        >
                                            {statusLabel}
                                        </span>
                                    );

                                    return (
                                        <TableRow key={job.id} hover>
                                            <TableCell>
                                                <span className="admin-cell-date">
                                                    {formatDateTime(job.startedAt)}
                                                </span>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 180, width: 180 }}>
                                                <Stack spacing={0.5} alignItems="flex-start">
                                                    <Typography
                                                        className="admin-cell-title"
                                                        noWrap
                                                        title={job.fileName}
                                                        sx={{ maxWidth: '100%' }}
                                                    >
                                                        {job.fileName || '—'}
                                                    </Typography>
                                                    <Box
                                                        component="span"
                                                        sx={{ display: 'inline-flex', width: 'max-content' }}
                                                    >
                                                        <span
                                                            className={`admin-status-badge admin-status-badge--compact ${
                                                                job.importsTickets
                                                                    ? 'admin-status-badge--active'
                                                                    : 'admin-status-badge--draft'
                                                            }`}
                                                        >
                                                            {job.importsTickets ? 'Có nhập vé' : 'Chỉ khai báo'}
                                                        </span>
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-text">
                                                    {job.supplierName || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-date">
                                                    {formatDrawDates(job.requestedDrawDates)}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center" sx={NUMERIC_COL_SX}>
                                                <span className="admin-cell-text tabular-nums">
                                                    {job.createdCount}/{job.requestedCount}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center" sx={NUMERIC_COL_SX}>
                                                <span className="admin-cell-text tabular-nums">
                                                    {job.declaredQuantity.toLocaleString('vi-VN')}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center" sx={NUMERIC_COL_SX}>
                                                <span
                                                    className="admin-cell-text tabular-nums"
                                                    style={{
                                                        fontWeight: shortfall ? 700 : undefined,
                                                        color: shortfall ? '#d97706' : undefined,
                                                    }}
                                                >
                                                    {job.importedQuantity.toLocaleString('vi-VN')}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center">
                                                {job.errorMessage ? (
                                                    <Tooltip title={job.errorMessage} arrow placement="top">
                                                        <span>{statusBadge}</span>
                                                    </Tooltip>
                                                ) : (
                                                    statusBadge
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                {job.originalFileUrl ? (
                                                    <Tooltip title="Tải tệp nhà cung cấp đã gửi">
                                                        <IconButton
                                                            size="small"
                                                            className="admin-table-action"
                                                            component={Link}
                                                            href={job.originalFileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <DownloadOutlinedIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <span className="admin-cell-text">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={totalRecords}
                    page={pageIndex}
                    onPageChange={(_, nextPage) => setPage(nextPage + 1)}
                    rowsPerPage={size}
                    onRowsPerPageChange={(event) => {
                        setLimit(Number(event.target.value));
                        setPage(1);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                    labelRowsPerPage="Số hàng mỗi trang:"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} của ${count !== -1 ? count : `hơn ${to}`}`
                    }
                    sx={{
                        borderTop: '1px solid var(--palette-divider)',
                        color: 'var(--palette-text-secondary)',
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: '0.875rem',
                        },
                    }}
                />
            </Box>
        </Card>
    );
};
