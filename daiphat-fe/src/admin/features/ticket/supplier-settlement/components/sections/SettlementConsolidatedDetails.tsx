import {
    Card,
    IconButton,
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
import { useState } from 'react';
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
}

export const SettlementConsolidatedDetails = ({
    inventoryRows = [],
    importBatches = [],
    returnBatches = [],
}: Props) => {
    const router = useAdminRouter();
    const [activeTab, setActiveTab] = useState(0);

    const totalSystemImportQty = inventoryRows.reduce((acc, r) => acc + (r.importedQuantity || 0), 0);
    const totalSystemReturnQty = inventoryRows.reduce((acc, r) => acc + (r.returnQuantity || 0), 0);
    const totalSystemReturnValue = inventoryRows.reduce((acc, r) => acc + (r.returnValue || 0), 0);

    return (
        <Card elevation={0} className="admin-datagrid-card" sx={{ height: 'auto !important' }}>
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
                                <TableCell>Trạng thái</TableCell>
                                <TableCell align="right">Số lượng nhập</TableCell>
                                <TableCell align="right">Giá trị nhập</TableCell>
                                <TableCell align="right" sx={{ width: 72 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {importBatches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ borderBottom: 'none', py: 8 }}>
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
                                    return (
                                        <TableRow key={batch.id} hover>
                                            <TableCell>
                                                <Typography
                                                    className="admin-cell-text"
                                                    fontWeight={700}
                                                    sx={{ cursor: 'pointer' }}
                                                    onClick={() => router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                                                >
                                                    {batch.batchCode || `#${batch.id}`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-text">
                                                    {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <AdminStatusBadge
                                                    label={getImportBatchStatusLabel(batch.status || undefined)}
                                                    modifier={getImportBatchStatusBadgeClass(batch.status || undefined)}
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
                                            <TableCell align="right">
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
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {activeTab === 2 && (
                <TableContainer className="admin-table-container">
                    <Table className="admin-table" size="medium">
                        <TableHead>
                            <TableRow>
                                <TableCell>Mã phiếu</TableCell>
                                <TableCell>Ngày quay</TableCell>
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
                                    <TableCell colSpan={7} align="center" sx={{ borderBottom: 'none', py: 8 }}>
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
                                    return (
                                        <TableRow key={batch.id} hover>
                                            <TableCell>
                                                <Typography
                                                    className="admin-cell-text"
                                                    fontWeight={700}
                                                    sx={{ cursor: 'pointer' }}
                                                    onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                                                >
                                                    {batch.batchCode || `#${batch.id}`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-text">
                                                    {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                                </span>
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
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Card>
    );
};
