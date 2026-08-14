"use client";

import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import {
    Box,
    Card,
    CircularProgress,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
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
import { useCallback, useState } from 'react';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { ROUTES } from '../../../../../constants/routes';
import type { ImportBatch, ImportBatchStatus } from '../../types/importBatch.type';
import type { useImportBatchList } from '../../hooks/useImportBatch';
import {
    getImportBatchStatusBadgeClass,
    getImportBatchStatusLabel,
    getImportModeBadgeClass,
    getImportModeChipLabel,
    getImportModeLabel,
    type ImportBatchImportMode,
} from '../../utils/batchTypeLabels';
import {
    displayImportBatchHeaderCodeRaw,
    formatImportBatchHeaderCode,
    formatImportBatchLinesSummaryCompact,
    formatImportBatchLinesSummaryTooltip,
    importBatchCodeMonospaceSx,
} from '../../utils/importBatchCode';
import { hasStartedImportBatchLineEntry } from '../../utils/importBatchEditDraft';
import {
    batchHasPendingLines,
    findFirstIncompleteLine,
    importBatchMissingStations,
    isImportBatchEditable,
} from '../../utils/importBatchProgress';
import { useSettings, dataGridContainerStyles } from '../../../../../shared/data-grid';
import { ImportBatchToolbar } from './ImportBatchToolbar';

type ImportBatchListProps = {
    listHook: ReturnType<typeof useImportBatchList>;
};

export const ImportBatchList = ({ listHook }: ImportBatchListProps) => {
    const router = useAdminRouter();
    const { settings, setSettings } = useSettings();
    const {
        batches,
        pagination,
        isLoading,
        error,
        filters,
        setSearch,
        setStatus,
        setImportMode,
        setPage,
        setLimit,
    } = listHook;
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [menuBatch, setMenuBatch] = useState<ImportBatch | null>(null);

    const page = (filters.page ?? 1) - 1;
    const rowsPerPage = filters.size ?? 10;

    const handleFilterChange = (fieldId: string, values: string[]) => {
        if (fieldId === 'status') {
            setStatus(values.length > 0 ? (values[0] as ImportBatchStatus) : '');
        } else if (fieldId === 'importMode') {
            setImportMode(values.length > 0 ? (values[0] as ImportBatchImportMode) : '');
        }
    };

    const handleClearFilters = () => {
        setStatus('');
        setImportMode('');
        setSearch('');
    };

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, batch: ImportBatch) => {
        setMenuAnchor(event.currentTarget);
        setMenuBatch(batch);
    };

    const handleCloseMenu = () => {
        setMenuAnchor(null);
        setMenuBatch(null);
    };

    const handleViewDetail = useCallback(
        (batchId: number) => router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batchId)),
        [router]
    );

    const handleAddTicket = useCallback(
        (batch: ImportBatch) => {
            const firstLine = findFirstIncompleteLine(batch);
            if (firstLine?.id != null) {
                router.push(ROUTES.ADMIN.IMPORT_BATCH.LINE_DETAIL(batch.id, firstLine.id));
                return;
            }
            router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id));
        },
        [router]
    );

    const handleEditBatch = useCallback(
        (batchId: number) => router.push(ROUTES.ADMIN.IMPORT_BATCH.EDIT(batchId)),
        [router]
    );

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách phiếu nhập lô. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <>
            <Card elevation={0} className="admin-datagrid-card">
                <Box sx={dataGridContainerStyles}>
                    {/* Integrated Toolbar with Search, JiraFilter, Columns & Settings */}
                    <ImportBatchToolbar
                        settings={settings}
                        onSettingsChange={setSettings}
                        filters={{
                            status: filters.status,
                            importMode: filters.importMode,
                            search: filters.search,
                        }}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                        onSearchChange={setSearch}
                    />

                    <TableContainer className="admin-table-container" sx={{ flex: 1, overflow: 'auto' }}>
                        <Table
                            className="admin-table"
                            sx={{
                                minWidth: 960,
                                height: batches.length === 0 ? '100%' : 'auto',
                                ...(settings.showCellBorders && {
                                    '& td, & th': { borderRight: '1px solid var(--palette-divider)' },
                                }),
                            }}
                            size={settings.density === 'compact' ? 'small' : 'medium'}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell>Mã phiếu</TableCell>
                                    <TableCell>Ngày quay</TableCell>
                                    <TableCell>Nhà cung cấp</TableCell>
                                    <TableCell align="center">Hình thức nhập</TableCell>
                                    <TableCell align="center">Trạng thái</TableCell>
                                    <TableCell sx={{ maxWidth: 200 }}>Mã lô / Loại</TableCell>
                                    <TableCell align="right">Khai báo</TableCell>
                                    <TableCell align="right">Đã nhập</TableCell>
                                    <TableCell sx={{ width: 72 }} align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                                <CircularProgress size={32} />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : batches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ borderBottom: 'none', py: 10 }}>
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
                                        const missingStations = importBatchMissingStations(batch);
                                        const hasPending = batchHasPendingLines(batch);

                                        return (
                                            <TableRow key={batch.id} hover>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                                        {(missingStations || hasPending) && (
                                                             <Tooltip
                                                                title={
                                                                    missingStations
                                                                        ? hasStartedImportBatchLineEntry(batch.id)
                                                                            ? 'Tiếp tục nhập phiếu'
                                                                            : 'Chưa bổ sung nhà đài'
                                                                        : 'Còn dòng chưa nhập đủ vé'
                                                                }
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        width: 8,
                                                                        height: 8,
                                                                        borderRadius: '50%',
                                                                        bgcolor: 'var(--palette-warning-main)',
                                                                        flexShrink: 0,
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                        <Typography
                                                            className="admin-cell-title"
                                                            sx={importBatchCodeMonospaceSx}
                                                            title={displayImportBatchHeaderCodeRaw(batch.batchCode, batch.id)}
                                                        >
                                                            {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="admin-cell-date">
                                                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="admin-cell-text">{batch.supplierName || '—'}</span>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title={getImportModeLabel(batch.importMode)}>
                                                        <span className={`admin-status-badge ${getImportModeBadgeClass(batch.importMode)}`}>
                                                            {getImportModeChipLabel(batch.importMode)}
                                                        </span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <span className={`admin-status-badge ${getImportBatchStatusBadgeClass(batch.status)}`}>
                                                        {getImportBatchStatusLabel(batch.status)}
                                                    </span>
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
                                                <TableCell align="right">
                                                    <span className="admin-cell-text">{declaredQty.toLocaleString('vi-VN')}</span>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <span className="admin-cell-text" style={{ fontWeight: 700, color: importedQty >= declaredQty && declaredQty > 0 ? '#16a34a' : 'inherit' }}>
                                                        {importedQty.toLocaleString('vi-VN')}
                                                    </span>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        aria-label="Thao tác"
                                                        onClick={(e) => handleOpenMenu(e, batch)}
                                                        className="admin-table-action"
                                                        sx={{
                                                            bgcolor: menuBatch?.id === batch.id && menuAnchor
                                                                ? 'var(--palette-action-hover)'
                                                                : 'transparent',
                                                        }}
                                                    >
                                                        <MoreVertIcon fontSize="small" />
                                                    </IconButton>
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

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor && menuBatch)}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: 180,
                            boxShadow: 'var(--customShadows-z20)',
                            borderRadius: 'var(--shape-borderRadius-md)',
                            py: 0.5,
                        },
                    },
                }}
            >
                <MenuItem
                    className="admin-menu-item"
                    onClick={() => {
                        if (menuBatch) handleViewDetail(menuBatch.id);
                        handleCloseMenu();
                    }}
                >
                    <ListItemIcon>
                        <VisibilityOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Xem chi tiết" />
                </MenuItem>
                {menuBatch && isImportBatchEditable(menuBatch) && (
                    <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                        <MenuItem
                            className="admin-menu-item"
                            onClick={() => {
                                if (menuBatch) handleEditBatch(menuBatch.id);
                                handleCloseMenu();
                            }}
                        >
                            <ListItemIcon>
                                <EditOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Chỉnh sửa" />
                        </MenuItem>
                    </CanAccess>
                )}
                {menuBatch && isImportBatchEditable(menuBatch) && (
                    <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                        <MenuItem
                            className="admin-menu-item"
                            onClick={() => {
                                if (menuBatch) handleAddTicket(menuBatch);
                                handleCloseMenu();
                            }}
                        >
                            <ListItemIcon>
                                <ConfirmationNumberOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Nhập vé" />
                        </MenuItem>
                    </CanAccess>
                )}
            </Menu>
        </>
    );
};
