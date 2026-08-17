"use client";

import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import {
    Box,
    Chip,
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
import type {
    ImportBatchFileJob,
    ImportBatchFileJobStatus,
} from '../../types/importBatch.type';

const STATUS_CHIP: Record<
    ImportBatchFileJobStatus,
    { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
    PENDING: { label: 'Chờ xử lý', color: 'default' },
    PROCESSING: { label: 'Đang xử lý', color: 'info' },
    COMPLETED: { label: 'Thành công', color: 'success' },
    PARTIAL_SUCCESS: { label: 'Thành công một phần', color: 'warning' },
    FAILED: { label: 'Thất bại', color: 'error' },
};

const formatDateTime = (value?: string) =>
    value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';

const formatDrawDates = (value?: string) => {
    if (!value) {
        return '—';
    }
    return value
        .split(',')
        .map((date) => dayjs(date.trim()).format('DD/MM'))
        .join(', ');
};

/**
 * Every attempt to import a supplier file, newest first.
 *
 * <p>Separate from the batch list because a run is not a voucher: it may have
 * produced two batches, or none at all, and the operator looking for "what did I
 * upload this morning" needs the run, not the documents.
 */
export const ImportBatchFileJobList = () => {
    const { jobs, pagination, isLoading, page, size, setPage, setLimit } =
        useImportBatchFileJobs();

    if (isLoading && jobs.length === 0) {
        return (
            <Stack alignItems="center" py={6}>
                <CircularProgress size={28} />
            </Stack>
        );
    }

    if (jobs.length === 0) {
        return (
            <Stack alignItems="center" py={6} spacing={1}>
                <Typography variant="body1" fontWeight={600}>
                    Chưa có lần nhập nào từ tệp
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Lịch sử sẽ hiện ở đây sau khi bạn dùng nút "Nhập từ tệp".
                </Typography>
            </Stack>
        );
    }

    return (
        <Box>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Thời điểm</TableCell>
                            <TableCell>Tệp</TableCell>
                            <TableCell>Nhà cung cấp</TableCell>
                            <TableCell>Ngày quay</TableCell>
                            <TableCell align="right">Phiếu tạo</TableCell>
                            <TableCell align="right">Khai báo</TableCell>
                            <TableCell align="right">Nhập được</TableCell>
                            <TableCell>Kết quả</TableCell>
                            <TableCell align="center">Tệp gốc</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {jobs.map((job: ImportBatchFileJob) => {
                            const chip = STATUS_CHIP[job.status] ?? STATUS_CHIP.PENDING;
                            const shortfall = job.importedQuantity < job.declaredQuantity;

                            return (
                                <TableRow key={job.id} hover>
                                    <TableCell>{formatDateTime(job.startedAt)}</TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>
                                        <Typography variant="body2" noWrap title={job.fileName}>
                                            {job.fileName || '—'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {job.importsTickets ? 'Có nhập vé' : 'Chỉ khai báo'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{job.supplierName || '—'}</TableCell>
                                    <TableCell>{formatDrawDates(job.requestedDrawDates)}</TableCell>
                                    <TableCell align="right">
                                        {job.createdCount}/{job.requestedCount}
                                    </TableCell>
                                    <TableCell align="right">{job.declaredQuantity}</TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            color: shortfall ? 'warning.main' : undefined,
                                            fontWeight: shortfall ? 700 : undefined,
                                        }}
                                    >
                                        {job.importedQuantity}
                                    </TableCell>
                                    <TableCell>
                                        <Stack spacing={0.5}>
                                            <Chip size="small" color={chip.color} label={chip.label} />
                                            {job.errorMessage && (
                                                <Typography
                                                    variant="caption"
                                                    color="error"
                                                    sx={{ maxWidth: 260 }}
                                                >
                                                    {job.errorMessage}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                        {job.originalFileUrl ? (
                                            <Tooltip title="Tải tệp nhà cung cấp đã gửi">
                                                <IconButton
                                                    size="small"
                                                    component={Link}
                                                    href={job.originalFileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <DownloadOutlinedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={pagination?.totalRecords ?? jobs.length}
                page={Math.max(0, page - 1)}
                onPageChange={(_, nextPage) => setPage(nextPage + 1)}
                rowsPerPage={size}
                onRowsPerPageChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="Số dòng mỗi trang"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} trong ${count}`}
            />
        </Box>
    );
};
