import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
    Chip,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { LoadingButton } from '../../components/ui/LoadingButton';
import { CanAccess } from '../../components/auth/CanAccess';
import { PERMISSIONS } from '../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import type { ImportBatch } from '../../api/importBatch.api';
import { useImportBatchList } from './hooks/useImportBatch';
import { getBatchTypeLabel } from './utils/batchTypeLabels';

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    IMPORTED: 'Đã nhập',
    IN_LEDGER: 'Đã vào sổ',
};

export const ImportBatchListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { batches, pagination, isLoading, filters, setPage, setLimit } = useImportBatchList();
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
        (batchId: number) => {
            navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batchId));
        },
        [navigate]
    );

    const handleAddTicket = useCallback(
        (batch: ImportBatch) => {
            const lines = batch.lines ?? [];
            const lineId = lines.length === 1 ? lines[0]?.id : undefined;
            navigate(ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH(batch.id, lineId));
        },
        [navigate]
    );

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách phiếu nhập lô" />
                    <Breadcrumb
                        items={[
                            { label: t('admin.dashboard.title'), to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                            { label: 'Danh sách' },
                        ]}
                    />
                </div>
                <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                    <LoadingButton
                        onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.CREATE)}
                        label="Khai báo phiếu nhập"
                        startIcon={<AddIcon />}
                        sx={{
                            minHeight: '2.25rem',
                            padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                        }}
                    />
                </CanAccess>
            </div>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Mã phiếu</TableCell>
                            <TableCell>Ngày quay</TableCell>
                            <TableCell>Nhà cung cấp</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Mã lô / Loại</TableCell>
                            <TableCell align="right">Khai báo</TableCell>
                            <TableCell align="right">Đã nhập</TableCell>
                            <TableCell align="center" width={120}>
                                Thao tác
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8}>
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                        Đang tải danh sách phiếu nhập lô...
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : batches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8}>
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                        Không có dữ liệu
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            batches.map((batch) => {
                                const importedQty = (batch.lines ?? []).reduce(
                                    (sum, line) => sum + (line.totalQuantity || 0),
                                    0
                                );
                                const lineSummary = (batch.lines ?? [])
                                    .map(
                                        (line) =>
                                            `${line.batchCode || '—'} (${getBatchTypeLabel(line.batchType)})`
                                    )
                                    .join(', ');

                                return (
                                    <TableRow key={batch.id} hover>
                                        <TableCell>#{batch.id}</TableCell>
                                        <TableCell>
                                            {batch.drawDate
                                                ? dayjs(batch.drawDate).format('DD/MM/YYYY')
                                                : '—'}
                                        </TableCell>
                                        <TableCell>{batch.supplierName || '—'}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={STATUS_LABELS[batch.status] || batch.status}
                                                color={batch.status === 'DRAFT' ? 'warning' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 280 }}>
                                            <Typography variant="body2" noWrap title={lineSummary}>
                                                {lineSummary || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {batch.totalDeclareQuantity ?? 0}
                                        </TableCell>
                                        <TableCell align="right">{importedQty}</TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                aria-label="Thao tác"
                                                onClick={(e) => handleOpenMenu(e, batch)}
                                                sx={{
                                                    color: 'text.primary',
                                                    bgcolor:
                                                        menuBatch?.id === batch.id && menuAnchor
                                                            ? 'action.hover'
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
                <TablePagination
                    component="div"
                    count={pagination.totalRecords ?? 0}
                    page={page}
                    onPageChange={(_e, newPage) => setPage(newPage + 1)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => setLimit(parseInt(e.target.value, 10))}
                    labelRowsPerPage="Số hàng mỗi trang:"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} của ${count !== -1 ? count : `hơn ${to}`}`
                    }
                />
            </TableContainer>

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
                            boxShadow: 3,
                            borderRadius: 1.5,
                            py: 0.5,
                        },
                    },
                }}
            >
                <MenuItem
                    onClick={() => {
                        if (menuBatch) {
                            handleViewDetail(menuBatch.id);
                        }
                        handleCloseMenu();
                    }}
                >
                    <ListItemIcon>
                        <VisibilityOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Xem chi tiết" />
                </MenuItem>
                {menuBatch?.status === 'DRAFT' && (
                    <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                        <MenuItem
                            onClick={() => {
                                if (menuBatch) {
                                    handleAddTicket(menuBatch);
                                }
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
