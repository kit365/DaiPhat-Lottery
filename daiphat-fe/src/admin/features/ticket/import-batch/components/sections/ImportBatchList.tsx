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
import { useNavigate } from 'react-router-dom';
import { CanAccess } from '../../../../../components/auth/CanAccess';
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
import { hasStartedImportBatchLineEntry } from '../../utils/importBatchEditDraft';
import {
    batchHasPendingLines,
    findFirstIncompleteLine,
    importBatchMissingStations,
    isImportBatchEditable,
} from '../../utils/importBatchProgress';

const headCellSx = {
    borderBottom: 'none',
    color: 'var(--palette-text-secondary)',
    fontWeight: 600,
    fontSize: '0.875rem',
    whiteSpace: 'nowrap' as const,
};

type ImportBatchListProps = {
    listHook: ReturnType<typeof useImportBatchList>;
};

export const ImportBatchList = ({ listHook }: ImportBatchListProps) => {
    const navigate = useNavigate();
    const { batches, pagination, isLoading, filters, setPage, setLimit } = listHook;
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [menuBatch, setMenuBatch] = useState<ImportBatch | null>(null);

    const page = (filters.page ?? 1) - 1;
    const rowsPerPage = filters.size ?? 10;

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, batch: ImportBatch) => {
        setMenuAnchor(event.currentTarget);
        setMenuBatch(batch);
    };

    const handleCloseMenu = () => {
        setMenuAnchor(null);
        setMenuBatch(null);
    };

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

    return (
        <>
            <Card
                elevation={0}
                className="admin-list-card admin-list-card--table"
                sx={{
                    borderRadius: 'var(--shape-borderRadius-lg)',
                    bgcolor: 'var(--palette-background-paper)',
                    boxShadow: 'var(--customShadows-card)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: 'none',
                }}
            >
                <TableContainer sx={{ position: 'relative', flex: 1 }}>
                    <Table sx={{ minWidth: 960 }} size="medium">
                        <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                            <TableRow>
                                <TableCell sx={headCellSx}>Mã phiếu</TableCell>
                                <TableCell sx={headCellSx}>Ngày quay</TableCell>
                                <TableCell sx={headCellSx}>Nhà cung cấp</TableCell>
                                <TableCell sx={headCellSx}>Hình thức nhập</TableCell>
                                <TableCell sx={headCellSx}>Trạng thái</TableCell>
                                <TableCell sx={{ ...headCellSx, maxWidth: 200 }}>Mã lô / Loại</TableCell>
                                <TableCell sx={headCellSx} align="right">
                                    Khai báo
                                </TableCell>
                                <TableCell sx={headCellSx} align="right">
                                    Đã nhập
                                </TableCell>
                                <TableCell sx={{ ...headCellSx, width: 72 }} align="right" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : batches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                        <Typography className="admin-datagrid-empty">Không có dữ liệu</Typography>
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
                                    const lineSummaryCompact = formatImportBatchLinesSummaryCompact(
                                        batch.lines
                                    );
                                    const lineSummaryTooltip = formatImportBatchLinesSummaryTooltip(
                                        batch.lines
                                    );
                                    const missingStations = importBatchMissingStations(batch);
                                    const hasPending = batchHasPendingLines(batch);

                                    return (
                                        <TableRow
                                            key={batch.id}
                                            hover
                                            sx={{
                                                '&:hover': { bgcolor: 'var(--palette-action-hover)' },
                                            }}
                                        >
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
                                                        title={displayImportBatchHeaderCodeRaw(
                                                            batch.batchCode,
                                                            batch.id
                                                        )}
                                                    >
                                                        {formatImportBatchHeaderCode(
                                                            batch.batchCode,
                                                            batch.id
                                                        )}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-date">
                                                    {batch.drawDate
                                                        ? dayjs(batch.drawDate).format('DD/MM/YYYY')
                                                        : '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-text">
                                                    {batch.supplierName || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={getImportModeLabel(batch.importMode)}>
                                                    <span
                                                        className={`admin-status-badge ${getImportModeBadgeClass(batch.importMode)}`}
                                                    >
                                                        {getImportModeChipLabel(batch.importMode)}
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`admin-status-badge ${getImportBatchStatusBadgeClass(batch.status)}`}
                                                >
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
                                                                    fontFamily:
                                                                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                                    fontSize: '0.75rem',
                                                                },
                                                            },
                                                        }}
                                                    >
                                                        <Typography
                                                            className="admin-cell-text"
                                                            noWrap
                                                            sx={{
                                                                ...importBatchCodeMonospaceSx,
                                                                maxWidth: 200,
                                                                cursor: 'default',
                                                            }}
                                                        >
                                                            {lineSummaryCompact}
                                                        </Typography>
                                                    </Tooltip>
                                                ) : (
                                                    <span className="admin-cell-text">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <span className="admin-cell-text">{declaredQty}</span>
                                            </TableCell>
                                            <TableCell align="right">
                                                <span className="admin-cell-text">{importedQty}</span>
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    aria-label="Thao tác"
                                                    onClick={(e) => handleOpenMenu(e, batch)}
                                                    sx={{
                                                        color: 'var(--palette-text-secondary)',
                                                        bgcolor:
                                                            menuBatch?.id === batch.id && menuAnchor
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
                        borderTop: '1px dashed var(--palette-background-neutral)',
                        color: 'var(--palette-text-secondary)',
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: '0.875rem',
                        },
                    }}
                />
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
