"use client";

import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import {
    Box,
    Button,
    Card,
    CircularProgress,
    LinearProgress,
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
import { useCallback } from 'react';
import { useNavigate } from '@/components/router-compat';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { AdminRowActionsMenu } from '../../../../../components/ui/AdminRowActionsMenu';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { ROUTES } from '../../../../../constants/routes';
import type { ImportBatch } from '../../types/importBatch.type';
import type { useImportBatchList } from '../../hooks/useImportBatch';
import {
    getImportBatchStatusBadgeClass,
    getImportBatchStatusLabel,
    getImportModeBadgeClass,
    getImportModeChipLabel,
    getImportModeLabel,
} from '../../utils/batchTypeLabels';
import {
    displayImportBatchHeaderCodeRaw,
    formatImportBatchHeaderCode,
    formatImportBatchLinesSummaryCompact,
    formatImportBatchLinesSummaryTooltip,
    importBatchCodeMonospaceSx,
} from '../../utils/importBatchCode';
import {
    findFirstIncompleteLine,
    getImportBatchListRowAction,
    getImportBatchProgress,
    importBatchMissingStations,
    importBatchNeedsAttention,
    isImportBatchEditable,
} from '../../utils/importBatchProgress';

type ImportBatchListProps = {
    listHook: ReturnType<typeof useImportBatchList>;
};

export const ImportBatchList = ({ listHook }: ImportBatchListProps) => {
    const navigate = useNavigate();
    const { batches, pagination, isLoading, filters, setPage, setLimit } = listHook;

    const page = (filters.page ?? 1) - 1;
    const rowsPerPage = filters.size ?? 10;

    const handleViewDetail = useCallback(
        (batchId: number) => navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batchId)),
        [navigate]
    );

    const handleAddTicket = useCallback(
        (batch: ImportBatch) => {
            const firstLine = findFirstIncompleteLine(batch);
            navigate(ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH(batch.id, firstLine?.id));
        },
        [navigate]
    );

    const handleEditBatch = useCallback(
        (batchId: number) => navigate(ROUTES.ADMIN.IMPORT_BATCH.EDIT(batchId)),
        [navigate]
    );

    const handleRowAction = useCallback(
        (batch: ImportBatch) => {
            const action = getImportBatchListRowAction(batch);
            if (!action) return;

            if (action.type === 'add-stations') {
                handleEditBatch(batch.id);
                return;
            }

            handleAddTicket(batch);
        },
        [handleAddTicket, handleEditBatch]
    );

    const renderImportProgress = (batch: ImportBatch, importedQty: number, declaredQty: number) => {
        const progress = getImportBatchProgress(batch);
        const needsAttention = importBatchNeedsAttention(batch);
        const percent = progress.declared > 0 ? progress.percent : 0;

        if (importBatchMissingStations(batch)) {
            return (
                <Stack spacing={0.75} alignItems="center" sx={{ minWidth: 132, mx: 'auto' }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'var(--palette-warning-dark, #B76E00)',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Chưa có nhà đài
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={0}
                        color="warning"
                        sx={{ width: '100%', height: 4, borderRadius: 999 }}
                    />
                </Stack>
            );
        }

        return (
            <Stack spacing={0.75} alignItems="center" sx={{ minWidth: 132, mx: 'auto' }}>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 700,
                        color: needsAttention ? 'var(--palette-warning-dark, #B76E00)' : 'var(--palette-text-primary)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {importedQty.toLocaleString('vi-VN')}
                    <Box component="span" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>
                        {' '}/ {declaredQty.toLocaleString('vi-VN')} vé
                    </Box>
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={percent}
                    color={needsAttention ? 'warning' : 'success'}
                    sx={{ width: '100%', height: 4, borderRadius: 999 }}
                />
            </Stack>
        );
    };

    const renderRowActionButton = (batch: ImportBatch) => {
        const action = getImportBatchListRowAction(batch);
        if (!action) {
            return null;
        }

        const isAddStations = action.type === 'add-stations';

        return (
            <CanAccess
                permission={
                    isAddStations ? PERMISSIONS.IMPORT_BATCH.CREATE : PERMISSIONS.TICKET.CREATE
                }
            >
                <Tooltip
                    title={isAddStations ? action.label : 'Vào màn hình nhập vé cho lô này'}
                    placement="top"
                    arrow
                >
                    <Button
                        size="small"
                        variant="outlined"
                        color={isAddStations ? 'warning' : 'info'}
                        className={isAddStations ? undefined : 'import-batch-import-cta'}
                        startIcon={
                            isAddStations ? (
                                <PlaylistAddOutlinedIcon sx={{ fontSize: '1rem !important' }} />
                            ) : (
                                <ConfirmationNumberOutlinedIcon
                                    className="import-batch-import-cta__ticket"
                                    sx={{ fontSize: '1rem !important' }}
                                />
                            )
                        }
                        endIcon={
                            !isAddStations ? (
                                <ArrowForwardRoundedIcon
                                    className="import-batch-import-cta__arrow"
                                    sx={{ fontSize: '1rem !important' }}
                                />
                            ) : undefined
                        }
                        onClick={() => handleRowAction(batch)}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            px: 1.25,
                            py: 0.5,
                            minHeight: 32,
                            boxShadow: 'none',
                            whiteSpace: 'nowrap',
                            ...(isAddStations && {
                                borderColor: 'rgba(var(--palette-warning-mainChannel) / 0.48)',
                                bgcolor: 'rgba(var(--palette-warning-mainChannel) / 0.08)',
                                '&:hover': {
                                    borderColor: 'var(--palette-warning-main)',
                                    bgcolor: 'rgba(var(--palette-warning-mainChannel) / 0.14)',
                                },
                            }),
                        }}
                    >
                        {action.label}
                    </Button>
                </Tooltip>
            </CanAccess>
        );
    };

    return (
        <>
            <Card elevation={0} className="admin-datagrid-card">
                <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <TableContainer className="admin-table-container" sx={{ flex: 1, overflow: 'auto' }}>
                        <Table className="admin-table" sx={{ minWidth: 960, height: batches.length === 0 ? '100%' : 'auto' }} size="medium">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Mã phiếu</TableCell>
                                    <TableCell>Ngày quay</TableCell>
                                    <TableCell align="center">Nhà cung cấp</TableCell>
                                    <TableCell>Hình thức nhập</TableCell>
                                    <TableCell align="center">Trạng thái</TableCell>
                                    <TableCell sx={{ maxWidth: 200 }}>Mã lô / Loại</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 148 }}>Tiến độ nhập</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 168 }}>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                                <CircularProgress size={32} />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : batches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                                <Typography className="admin-datagrid-empty">Không có dữ liệu</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    batches.map((batch) => {
                                        const importedQty =
                                            batch.totalImportedQuantity ??
                                            (batch.lines ?? []).reduce(
                                                (sum, line) => sum + (line.totalQuantity || 0),
                                                0
                                            );
                                        const declaredQty =
                                            batch.totalDeclareQuantity ??
                                            (batch.lines ?? []).reduce(
                                                (sum, line) => sum + (line.declareQuantity || 0),
                                                0
                                            );
                                        const lineSummaryCompact = formatImportBatchLinesSummaryCompact(batch.lines);
                                        const lineSummaryTooltip = formatImportBatchLinesSummaryTooltip(batch.lines);
                                        const needsAttention = importBatchNeedsAttention(batch);

                                        return (
                                            <TableRow
                                                key={batch.id}
                                                className={needsAttention ? 'admin-table-row-attention' : undefined}
                                                sx={
                                                    needsAttention
                                                        ? {
                                                            boxShadow: 'inset 3px 0 0 var(--palette-warning-main)',
                                                        }
                                                        : undefined
                                                }
                                            >
                                                <TableCell>
                                                    <Typography
                                                        className="admin-cell-title"
                                                        sx={importBatchCodeMonospaceSx}
                                                        title={displayImportBatchHeaderCodeRaw(batch.batchCode, batch.id)}
                                                    >
                                                        {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="admin-cell-date">
                                                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <span className="admin-cell-text">{batch.supplierName || '—'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title={getImportModeLabel(batch.importMode)}>
                                                        <span className={`admin-status-badge ${getImportModeBadgeClass(batch.importMode)}`}>
                                                            {getImportModeChipLabel(batch.importMode)}
                                                        </span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                        <span className={`admin-status-badge ${getImportBatchStatusBadgeClass(batch.status)}`}>
                                                            {getImportBatchStatusLabel(batch.status)}
                                                        </span>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 200 }}>
                                                    {lineSummaryCompact ? (
                                                        <Tooltip
                                                            title={lineSummaryTooltip}
                                                            slotProps={{
                                                                tooltip: {
                                                                    sx: {
                                                                        maxWidth: 520,
                                                                        whiteSpace: 'pre-line',
                                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                                        fontSize: '0.75rem',
                                                                    },
                                                                },
                                                            }}
                                                        >
                                                            <Typography
                                                                className="admin-cell-text"
                                                                noWrap
                                                                sx={{ ...importBatchCodeMonospaceSx, maxWidth: 200, cursor: 'default' }}
                                                            >
                                                                {lineSummaryCompact}
                                                            </Typography>
                                                        </Tooltip>
                                                    ) : (
                                                        <span className="admin-cell-text">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {renderImportProgress(batch, importedQty, declaredQty)}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.75}
                                                        alignItems="center"
                                                        justifyContent="center"
                                                    >
                                                        {renderRowActionButton(batch)}
                                                        <AdminRowActionsMenu
                                                            items={[
                                                                {
                                                                    id: 'view',
                                                                    label: 'Xem chi tiết',
                                                                    icon: 'view',
                                                                    onClick: () => handleViewDetail(batch.id),
                                                                },
                                                                {
                                                                    id: 'edit',
                                                                    label: 'Chỉnh sửa',
                                                                    icon: 'edit',
                                                                    onClick: () => handleEditBatch(batch.id),
                                                                    hidden: !isImportBatchEditable(batch),
                                                                    permission: PERMISSIONS.IMPORT_BATCH.CREATE,
                                                                },
                                                                {
                                                                    id: 'add-ticket',
                                                                    label: 'Nhập vé',
                                                                    icon: <ConfirmationNumberOutlinedIcon />,
                                                                    onClick: () => handleAddTicket(batch),
                                                                    hidden: !isImportBatchEditable(batch),
                                                                    permission: PERMISSIONS.TICKET.CREATE,
                                                                },
                                                            ]}
                                                        />
                                                    </Stack>
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
                        count={pagination.totalRecords ?? 0}
                        page={page}
                        onPageChange={(_e, newPage) => setPage(newPage + 1)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => setLimit(parseInt(e.target.value, 10))}
                        rowsPerPageOptions={[5, 10, 25, 50]}
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
        </>
    );
};
