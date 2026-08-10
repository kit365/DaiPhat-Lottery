"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
    Box,
    Button,
    Card,
    CircularProgress,
    Collapse,
    IconButton,
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
import React, { useCallback, useMemo, useState } from 'react';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { AdminRowActionsMenu } from '../../../../../components/ui/AdminRowActionsMenu';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { ROUTES } from '../../../../../constants/routes';
import { useStations } from '../../../../station/hooks/useStation';
import { ImportBatchLineImportHost } from '../../../inventory/components/sections/ImportBatchLineImportHost';
import { ImportBatchLineImportTable } from '../../../inventory/components/sections/ImportBatchLineImportTable';
import type { ImportBatch } from '../../types/importBatch.type';
import type { useImportBatchList } from '../../hooks/useImportBatch';
import {
    getImportBatchStatusBadgeClass,
    getImportBatchStatusChipLabel,
    getImportModeBadgeClass,
    getImportModeChipLabel,
    getImportModeLabel,
} from '../../utils/batchTypeLabels';
import {
    displayImportBatchHeaderCodeRaw,
    formatImportBatchHeaderCode,
    importBatchCodeMonospaceSx,
} from '../../utils/importBatchCode';
import {
    batchHasPendingLines,
    getImportBatchListRowAction,
    getImportBatchProgress,
    importBatchMissingStations,
    importBatchNeedsAttention,
    isImportBatchEditable,
} from '../../utils/importBatchProgress';

const importBatchNeedsTicketImport = (batch: ImportBatch) =>
    (batch.lines?.length ?? 0) > 0 &&
    !importBatchMissingStations(batch) &&
    batchHasPendingLines(batch);

type ImportBatchListProps = {
    listHook: ReturnType<typeof useImportBatchList>;
};

export const ImportBatchList = ({ listHook }: ImportBatchListProps) => {
    const router = useAdminRouter();
    const { batches, pagination, isLoading, filters, setPage, setLimit } = listHook;
    const [openRows, setOpenRows] = useState<number[]>([]);
    const [importTarget, setImportTarget] = useState<{ batchId: number; lineId: string } | null>(
        null
    );

    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = (providersRes as { data?: { recordList?: Array<{ id?: number; _id?: number; name?: string }> } })?.data?.recordList || [];

    const resolveStationName = useCallback(
        (stationId?: number | string) => {
            if (!stationId) return '—';
            return (
                providers.find((p) => String(p.id || p._id) === String(stationId))?.name ??
                `Đài #${stationId}`
            );
        },
        [providers]
    );

    const page = (filters.page ?? 1) - 1;
    const rowsPerPage = filters.size ?? 10;

    const handleViewDetail = useCallback(
        (batchId: number) => router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batchId)),
        [router]
    );

    const handleEditBatch = useCallback(
        (batchId: number) => router.push(ROUTES.ADMIN.IMPORT_BATCH.EDIT(batchId)),
        [router]
    );

    const toggleRow = useCallback((batch: ImportBatch) => {
        if (importBatchNeedsTicketImport(batch)) {
            return;
        }

        setOpenRows((prev) =>
            prev.includes(batch.id) ? prev.filter((id) => id !== batch.id) : [...prev, batch.id]
        );
    }, []);

    const handleOpenImportDialog = useCallback((batchId: number, lineId: string) => {
        setImportTarget({ batchId, lineId });
    }, []);

    const handleCloseImportDialog = useCallback(() => {
        setImportTarget(null);
    }, []);

    const handleRowAction = useCallback(
        (batch: ImportBatch) => {
            const action = getImportBatchListRowAction(batch);
            if (action?.type === 'add-stations') {
                handleEditBatch(batch.id);
            }
        },
        [handleEditBatch]
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
        if (!action || action.type !== 'add-stations') {
            return null;
        }

        return (
            <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                <Tooltip title={action.label} placement="top" arrow>
                    <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        className="import-batch-line-table-action"
                        startIcon={<PlaylistAddOutlinedIcon sx={{ fontSize: '0.9375rem !important' }} />}
                        onClick={() => handleRowAction(batch)}
                        sx={{
                            borderColor: 'rgba(var(--palette-warning-mainChannel) / 0.48)',
                            bgcolor: 'rgba(var(--palette-warning-mainChannel) / 0.08)',
                            '&:hover': {
                                borderColor: 'var(--palette-warning-main)',
                                bgcolor: 'rgba(var(--palette-warning-mainChannel) / 0.14)',
                            },
                        }}
                    >
                        {action.label}
                    </Button>
                </Tooltip>
            </CanAccess>
        );
    };

    const expandedBatchMap = useMemo(() => {
        const map = new Map<number, ImportBatch>();
        batches.forEach((batch) => map.set(batch.id, batch));
        return map;
    }, [batches]);

    return (
        <>
            <Card elevation={0} className="admin-datagrid-card" sx={{ height: 640 }}>
                <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <TableContainer className="admin-table-container" sx={{ flex: 1 }}>
                        <Table className="admin-table" sx={{ height: batches.length === 0 ? '100%' : 'auto' }} size="medium">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Mã phiếu</TableCell>
                                    <TableCell>Ngày quay</TableCell>
                                    <TableCell align="center">Nhà cung cấp</TableCell>
                                    <TableCell>Hình thức nhập</TableCell>
                                    <TableCell align="center">Trạng thái</TableCell>
                                    <TableCell align="center">Tiến độ nhập</TableCell>
                                    <TableCell align="center">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                                <CircularProgress size={32} />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : batches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ borderBottom: 'none', py: 10 }}>
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
                                        const needsAttention = importBatchNeedsAttention(batch);
                                        const canExpand = (batch.lines?.length ?? 0) > 0;
                                        const needsTicketImport = importBatchNeedsTicketImport(batch);
                                        const isOpen = needsTicketImport || openRows.includes(batch.id);
                                        const canCollapse = canExpand && !needsTicketImport;

                                        return (
                                            <React.Fragment key={batch.id}>
                                                <TableRow
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
                                                                {getImportBatchStatusChipLabel(batch.status)}
                                                            </span>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {renderImportProgress(batch, importedQty, declaredQty)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack
                                                            direction="row"
                                                            spacing={0.5}
                                                            alignItems="center"
                                                            justifyContent="center"
                                                            flexWrap="nowrap"
                                                            sx={{ minWidth: 0 }}
                                                        >
                                                            {renderRowActionButton(batch)}
                                                            {canExpand && (
                                                                <Tooltip
                                                                    title={
                                                                        needsTicketImport
                                                                            ? 'Phiếu chưa nhập đủ, không thể thu gọn'
                                                                            : isOpen
                                                                              ? 'Thu gọn danh sách đài'
                                                                              : 'Mở danh sách đài'
                                                                    }
                                                                    placement="top"
                                                                    arrow
                                                                >
                                                                    <span>
                                                                        <IconButton
                                                                            size="small"
                                                                            disabled={isOpen && !canCollapse}
                                                                            aria-label={
                                                                                isOpen
                                                                                    ? 'Thu gọn danh sách đài'
                                                                                    : 'Mở danh sách đài'
                                                                            }
                                                                            onClick={() => toggleRow(batch)}
                                                                            sx={{
                                                                                color: 'var(--palette-text-secondary)',
                                                                            }}
                                                                        >
                                                                            {isOpen ? (
                                                                                <KeyboardArrowUpIcon fontSize="small" />
                                                                            ) : (
                                                                                <KeyboardArrowDownIcon fontSize="small" />
                                                                            )}
                                                                        </IconButton>
                                                                    </span>
                                                                </Tooltip>
                                                            )}
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
                                                                ]}
                                                            />
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>

                                                {canExpand && (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={7}
                                                            sx={{
                                                                py: 0,
                                                                px: 0,
                                                                borderBottom: isOpen
                                                                    ? '1px dashed var(--palette-divider)'
                                                                    : 'none',
                                                                bgcolor: 'var(--palette-background-neutral)',
                                                            }}
                                                        >
                                                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                                                <Box className="admin-import-batch-line-embed-panel">
                                                                    <ImportBatchLineImportTable
                                                                        embedded
                                                                        lines={expandedBatchMap.get(batch.id)?.lines ?? batch.lines ?? []}
                                                                        batchStatus={batch.status}
                                                                        drawDate={batch.drawDate}
                                                                        resolveStationName={resolveStationName}
                                                                        onImportLine={(lineId) =>
                                                                            handleOpenImportDialog(batch.id, lineId)
                                                                        }
                                                                    />
                                                                </Box>
                                                            </Collapse>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
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
                            flexShrink: 0,
                        }}
                    />
                </Box>
            </Card>

            <ImportBatchLineImportHost
                batchId={importTarget?.batchId ?? null}
                lineId={importTarget?.lineId ?? null}
                onClose={handleCloseImportDialog}
            />
        </>
    );
};
