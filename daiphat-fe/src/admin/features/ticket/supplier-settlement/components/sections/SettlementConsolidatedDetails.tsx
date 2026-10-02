import {
    Alert,
    Card,
    Collapse,
    Box,
    IconButton,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { Fragment, useState } from 'react';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import { ADMIN_ROW_ACTION_ICONS } from '@/admin/components/ui/adminRowActionIcons';
import { getTabBadgeStyles } from '@/admin/utils/badge';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { getImportBatchStatusBadgeClass, getImportBatchStatusLabel } from '../../../import-batch/utils/batchTypeLabels';
import { getReturnBatchStatusBadgeClass, getReturnBatchStatusLabel } from '../../../return-batch/utils/returnBatchLabels';
import type {
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
} from '../../types/supplierSettlement.type';

interface Props {
    inventoryRows: SettlementStationInventory[];
    importBatches: SettlementOverviewImportBatch[];
    returnBatches: SettlementOverviewReturnBatch[];
    returnDetailsLocked?: boolean;
    returnLockMessage?: string;
}

export const SettlementConsolidatedDetails = ({
    inventoryRows = [],
    importBatches = [],
    returnBatches = [],
    returnDetailsLocked = false,
    returnLockMessage,
}: Props) => {
    const router = useAdminRouter();
    const [activeTab, setActiveTab] = useState(0);
    const [expandedImportBatches, setExpandedImportBatches] = useState<Set<number>>(new Set());
    const [expandedReturnBatches, setExpandedReturnBatches] = useState<Set<number>>(new Set());

    const totalSystemImportQty = inventoryRows.reduce((acc, r) => acc + (r.importedQuantity || 0), 0);
    const totalSystemReturnQty = inventoryRows.reduce((acc, r) => acc + (r.returnQuantity || 0), 0);
    const totalSystemReturnValue = inventoryRows.reduce((acc, r) => acc + (r.returnValue || 0), 0);

    const toggleExpanded = (
        setter: React.Dispatch<React.SetStateAction<Set<number>>>,
        id: number
    ) => {
        setter((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: 'var(--shape-borderRadius-lg)',
                boxShadow: 'var(--customShadows-card)',
                bgcolor: 'var(--palette-background-paper)',
                overflow: 'hidden',
                border: '1px solid var(--palette-divider)',
                display: 'flex',
                flexDirection: 'column',
                height: 'auto',
            }}
        >
            <Tabs
                value={activeTab}
                onChange={(_, next: number) => setActiveTab(next)}
                variant="scrollable"
                scrollButtons="auto"
                className="admin-tabs"
            >
                <Tab
                    disableRipple
                    className="admin-tab"
                    label="Tồn kho theo nhà đài"
                    icon={
                        <span className="admin-tab-badge" style={getTabBadgeStyles('all', activeTab === 0)}>
                            {inventoryRows.length}
                        </span>
                    }
                    iconPosition="end"
                />
                <Tab
                    disableRipple
                    className="admin-tab"
                    label="Phiếu nhập lô"
                    icon={
                        <span className="admin-tab-badge" style={getTabBadgeStyles('info', activeTab === 1)}>
                            {importBatches.length}
                        </span>
                    }
                    iconPosition="end"
                />
                <Tab
                    disableRipple
                    className="admin-tab"
                    label="Phiếu trả vé"
                    icon={
                        <span className="admin-tab-badge" style={getTabBadgeStyles('warning', activeTab === 2)}>
                            {returnBatches.length}
                        </span>
                    }
                    iconPosition="end"
                />
            </Tabs>

            {activeTab === 0 && (
                <TableContainer className="admin-table-container">
                    <Table className="admin-table" size="medium">
                        <TableHead>
                            <TableRow>
                                <TableCell>Nhà đài</TableCell>
                                <TableCell align="right">Nhập</TableCell>
                                <TableCell align="right">Đã bán</TableCell>
                                <TableCell align="right">Còn lại</TableCell>
                                <TableCell align="right">Hỏng</TableCell>
                                <TableCell align="right">Thất lạc</TableCell>
                                <TableCell align="right">Hủy số</TableCell>
                                <TableCell align="right">Trả</TableCell>
                                <TableCell align="right">Giá trị trả</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {inventoryRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ borderBottom: 'none', py: 8 }}>
                                        <Typography className="admin-datagrid-empty">
                                            Chưa có dữ liệu tồn kho theo nhà đài cho kỳ đối soát này.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                inventoryRows.map((row) => (
                                    <TableRow key={row.lotteryStationId} hover>
                                        <TableCell>
                                            <span className="admin-cell-text" style={{ fontWeight: 700 }}>
                                                {row.lotteryStationName || `#${row.lotteryStationId}`}
                                            </span>
                                        </TableCell>
                                        <TableCell align="right">
                                            <span className="admin-cell-text">{row.importedQuantity.toLocaleString('vi-VN')}</span>
                                        </TableCell>
                                        <TableCell align="right">
                                            <span className="admin-cell-text">{row.soldQuantity.toLocaleString('vi-VN')}</span>
                                        </TableCell>
                                        <TableCell align="right">
                                            <span className="admin-cell-text" style={{ fontWeight: 700 }}>
                                                {row.remainingQuantity.toLocaleString('vi-VN')}
                                            </span>
                                        </TableCell>
                                        <TableCell align="right">
                                            <span className="admin-cell-text">{row.damagedQuantity.toLocaleString('vi-VN')}</span>
                                        </TableCell>
                                        <TableCell align="right">
                                            <span className="admin-cell-text">{row.lostQuantity.toLocaleString('vi-VN')}</span>
                                        </TableCell>
                                        <TableCell align="right">
                                            <span className="admin-cell-text">{row.voidedQuantity.toLocaleString('vi-VN')}</span>
                                        </TableCell>
                                        <TableCell align="right">
                                            <span className="admin-cell-text">{row.returnQuantity.toLocaleString('vi-VN')}</span>
                                        </TableCell>
                                        <TableCell align="right">
                                            <span className="admin-cell-text" style={{ fontWeight: 700 }}>
                                                {formatImportCost(row.returnValue)} VNĐ
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {activeTab === 1 && (
                <TableContainer className="admin-table-container">
                    <Table className="admin-table" size="medium">
                        <TableHead>
                            <TableRow>
                                <TableCell>Mã phiếu</TableCell>
                                <TableCell>Ngày quay</TableCell>
                                <TableCell>Người nhập lô</TableCell>
                                <TableCell align="right">Dòng / SL</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell align="right">Giá trị nhập</TableCell>
                                <TableCell align="right" sx={{ width: 72 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {importBatches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ borderBottom: 'none', py: 8 }}>
                                        <Typography className="admin-datagrid-empty">
                                            Chưa có phiếu nhập lô liên kết kỳ đối soát này.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                importBatches.map((batch) => {
                                    const qty =
                                        batch.totalImportedQuantity ||
                                        batch.totalDeclareQuantity ||
                                        (importBatches.length === 1 ? totalSystemImportQty : 0);
                                    const val = batch.totalImportedCostValue || batch.totalDeclaredCostValue || 0;
                                    const lines = batch.lines || [];
                                    const expanded = expandedImportBatches.has(batch.id);
                                    return (
                                        <Fragment key={batch.id}>
                                        <TableRow key={batch.id} hover>
                                            <TableCell>
                                                <span
                                                    className="admin-cell-text"
                                                    style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--palette-primary-main)' }}
                                                    onClick={() => router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                                                >
                                                    {batch.batchCode || `#${batch.id}`}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-text">
                                                    {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <span className="admin-cell-text">{batch.importedByDisplayName || '—'}</span>
                                                    {batch.importedAt && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {dayjs(batch.importedAt).format('HH:mm · DD/MM/YYYY')}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                <span className="admin-cell-text">
                                                    {lines.length || batch.lineCount || 0} dòng · {qty.toLocaleString('vi-VN')} vé
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <AdminStatusBadge
                                                    label={getImportBatchStatusLabel(batch.status || undefined)}
                                                    modifier={getImportBatchStatusBadgeClass(batch.status || undefined)}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <span className="admin-cell-text" style={{ fontWeight: 700 }}>
                                                    {formatImportCost(val)} VNĐ
                                                </span>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" justifyContent="flex-end">
                                                    {lines.length > 0 && (
                                                        <Tooltip title={expanded ? 'Thu gọn dòng nhập' : 'Xem các dòng nhập'}>
                                                            <IconButton
                                                                size="small"
                                                                aria-label={expanded ? 'Thu gọn dòng nhập' : 'Xem các dòng nhập'}
                                                                onClick={() => toggleExpanded(setExpandedImportBatches, batch.id)}
                                                            >
                                                                {expanded ? <ExpandLessOutlinedIcon fontSize="small" /> : <ExpandMoreOutlinedIcon fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="Xem chi tiết phiếu nhập">
                                                        <IconButton
                                                            size="small"
                                                            className="admin-table-action"
                                                            aria-label="Xem chi tiết phiếu nhập"
                                                            onClick={() => router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                                                        >
                                                            {ADMIN_ROW_ACTION_ICONS.view}
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                        {lines.length > 0 && (
                                            <TableRow key={`${batch.id}-lines`}>
                                                <TableCell colSpan={7} sx={{ p: 0, borderBottom: 'none' }}>
                                                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                                                        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                            <Typography variant="caption" fontWeight={800} color="#475569">CHI TIẾT IMPORT-BATCH-LINE</Typography>
                                                            <Stack spacing={0.75} sx={{ mt: 1 }}>
                                                                {lines.map((line) => (
                                                                    <Stack key={line.id} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 2 }} justifyContent="space-between">
                                                                        <Typography variant="body2" fontWeight={700}>{line.lotteryStationName || `Nhà đài #${line.lotteryStationId || '—'}`}</Typography>
                                                                        <Typography variant="body2" color="text.secondary">Khai báo: {Number(line.declareQuantity || 0).toLocaleString('vi-VN')} · Đã nhập: {Number(line.totalQuantity || 0).toLocaleString('vi-VN')}</Typography>
                                                                        <Typography variant="body2" color="text.secondary">{line.status || '—'}</Typography>
                                                                    </Stack>
                                                                ))}
                                                            </Stack>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {activeTab === 2 && (
                <Box>
                <TableContainer className="admin-table-container">
                    <Table className="admin-table" size="medium">
                        <TableHead>
                            <TableRow>
                                <TableCell>Mã phiếu</TableCell>
                                <TableCell>Ngày quay</TableCell>
                                <TableCell>Người xử lý phiếu trả</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell align="right">Số lượng trả</TableCell>
                                <TableCell align="right">Giá trị trả</TableCell>
                                <TableCell align="center">Bằng chứng</TableCell>
                                <TableCell align="right" sx={{ width: 72 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {returnBatches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ borderBottom: 'none', py: 8 }}>
                                        <Typography className="admin-datagrid-empty">
                                            Chưa có phiếu trả vé liên kết kỳ đối soát này.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                returnBatches.map((batch) => {
                                    const qty = batch.totalQuantity || (returnBatches.length === 1 ? totalSystemReturnQty : 0);
                                    const val =
                                        batch.totalReturnValue || (returnBatches.length === 1 ? totalSystemReturnValue : 0);
                                    const hasEvidence = Boolean(batch.returnEvidenceUrl || batch.returnReceiptUrl);
                                    const lines = batch.lines || [];
                                    const expanded = expandedReturnBatches.has(batch.id);
                                    return (
                                        <Fragment key={batch.id}>
                                        <TableRow key={batch.id} hover>
                                            <TableCell>
                                                <span
                                                    className="admin-cell-text"
                                                    style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--palette-primary-main)' }}
                                                    onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                                                >
                                                    {batch.batchCode || `#${batch.id}`}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-text">
                                                    {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <span className="admin-cell-text">{batch.returnedByDisplayName || '—'}</span>
                                                    {batch.returnedAt && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {dayjs(batch.returnedAt).format('HH:mm · DD/MM/YYYY')}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <AdminStatusBadge
                                                    label={getReturnBatchStatusLabel(batch.status as any, batch.statusLabel)}
                                                    modifier={getReturnBatchStatusBadgeClass(batch.status as any)}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <span className="admin-cell-text">{qty.toLocaleString('vi-VN')} vé</span>
                                            </TableCell>
                                            <TableCell align="right">
                                                <span className="admin-cell-text" style={{ fontWeight: 700 }}>
                                                    {formatImportCost(val)} VNĐ
                                                </span>
                                            </TableCell>
                                            <TableCell align="center">
                                                <AdminStatusBadge
                                                    label={hasEvidence ? 'Đã đính kèm' : 'Chưa có'}
                                                    modifier={
                                                        hasEvidence
                                                            ? 'admin-status-badge--active'
                                                            : 'admin-status-badge--inactive'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" justifyContent="flex-end">
                                                    {lines.length > 0 && (
                                                        <Tooltip title={expanded ? 'Thu gọn dòng trả' : 'Xem các dòng trả'}>
                                                            <IconButton
                                                                size="small"
                                                                aria-label={expanded ? 'Thu gọn dòng trả' : 'Xem các dòng trả'}
                                                                onClick={() => toggleExpanded(setExpandedReturnBatches, batch.id)}
                                                            >
                                                                {expanded ? <ExpandLessOutlinedIcon fontSize="small" /> : <ExpandMoreOutlinedIcon fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="Xem chi tiết phiếu trả">
                                                        <IconButton
                                                            size="small"
                                                            className="admin-table-action"
                                                            aria-label="Xem chi tiết phiếu trả"
                                                            onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                                                        >
                                                            {ADMIN_ROW_ACTION_ICONS.view}
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                        {lines.length > 0 && (
                                            <TableRow key={`${batch.id}-lines`}>
                                                <TableCell colSpan={8} sx={{ p: 0, borderBottom: 'none' }}>
                                                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                                                        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                            <Typography variant="caption" fontWeight={800} color="#475569">CHI TIẾT PHIẾU TRẢ</Typography>
                                                            <Stack spacing={0.75} sx={{ mt: 1 }}>
                                                                {lines.map((line) => (
                                                                    <Stack key={line.id} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 2 }} justifyContent="space-between">
                                                                        <Typography variant="body2" fontWeight={700}>{line.lotteryStationName || `Nhà đài #${line.lotteryStationId || '—'}`}</Typography>
                                                                        <Typography variant="body2" color="text.secondary">SL trả: {Number(line.totalQuantity || 0).toLocaleString('vi-VN')} · Còn kiểm tra: {Number(line.remainingInspectableQuantity || 0).toLocaleString('vi-VN')}</Typography>
                                                                        <Typography variant="body2" color="text.secondary">{line.statusLabel || line.status || '—'}</Typography>
                                                                    </Stack>
                                                                ))}
                                                            </Stack>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {returnDetailsLocked && (
                    <Alert
                        severity="warning"
                        icon={<LockOutlinedIcon />}
                        sx={{ m: 2, mt: 1.5, borderRadius: '12px', alignItems: 'flex-start' }}
                    >
                        <Typography variant="subtitle2" fontWeight={800}>
                            Thông tin phiếu nhập / trả đang bị khóa
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>
                            {returnLockMessage || 'Thông tin vẫn được hiển thị để đối chiếu nhưng hiện không khả dụng để thao tác.'}
                        </Typography>
                    </Alert>
                )}
                </Box>
            )}
        </Card>
    );
};
