import { useAdminRouter } from '@/admin/hooks/useAdminRouter';

import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

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

} from '@mui/material';

import dayjs from 'dayjs';

import { useState } from 'react';

import { getTabBadgeStyles } from '../../../../../utils/badge';

import { ROUTES } from '../../../../../constants/routes';

import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';

import {

    getImportBatchStatusBadgeClass,

    getImportBatchStatusLabel,

} from '../../../import-batch/utils/batchTypeLabels';

import {

    getReturnBatchStatusBadgeClass,

    getReturnBatchStatusLabel,

} from '../../../return-batch/utils/returnBatchLabels';

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



const emptyStateCellSx = { borderBottom: 'none', py: 10 };



export const SettlementConsolidatedDetails = ({

    inventoryRows = [],

    importBatches = [],

    returnBatches = [],

}: Props) => {

    const router = useAdminRouter();

    const [activeTab, setActiveTab] = useState(0);



    return (

        <Card

            elevation={0}

            className="admin-datagrid-card"

            sx={{

                borderRadius: '16px',

                border: '1px solid #e2e8f0',

                bgcolor: '#fff',

                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',

                overflow: 'hidden',

            }}

        >

            <Tabs

                value={activeTab}

                onChange={(_, newValue) => setActiveTab(newValue)}

                variant="scrollable"

                scrollButtons={false}

                className="admin-tabs"

            >

                <Tab

                    disableRipple

                    label="Tồn kho theo nhà đài"

                    icon={

                        <span className="admin-tab-badge" style={getTabBadgeStyles('all', activeTab === 0)}>

                            {inventoryRows.length}

                        </span>

                    }

                    iconPosition="end"

                    className="admin-tab"

                />

                <Tab

                    disableRipple

                    label="Phiếu nhập lô"

                    icon={

                        <span className="admin-tab-badge" style={getTabBadgeStyles('info', activeTab === 1)}>

                            {importBatches.length}

                        </span>

                    }

                    iconPosition="end"

                    className="admin-tab"

                />

                <Tab

                    disableRipple

                    label="Phiếu trả vé"

                    icon={

                        <span className="admin-tab-badge" style={getTabBadgeStyles('warning', activeTab === 2)}>

                            {returnBatches.length}

                        </span>

                    }

                    iconPosition="end"

                    className="admin-tab"

                />

            </Tabs>



            {activeTab === 0 && (

                <TableContainer className="admin-table-container">

                    <Table className="admin-table" size="medium">

                        <TableHead>

                            <TableRow>

                                <TableCell align="center">Nhà đài</TableCell>

                                <TableCell align="center">Nhập</TableCell>

                                <TableCell align="center">Đã bán</TableCell>

                                <TableCell align="center">Còn lại</TableCell>

                                <TableCell align="center">Hỏng</TableCell>

                                <TableCell align="center">Thất lạc</TableCell>

                                <TableCell align="center">Hủy số</TableCell>

                                <TableCell align="center">Trả</TableCell>

                                <TableCell align="center">Giá trị trả</TableCell>

                            </TableRow>

                        </TableHead>

                        <TableBody>

                            {inventoryRows.map((row) => (

                                <TableRow key={row.lotteryStationId} hover>

                                    <TableCell align="center">

                                        <span className="admin-cell-title">

                                            {row.lotteryStationName || `#${row.lotteryStationId}`}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-text">

                                            {row.importedQuantity.toLocaleString('vi-VN')}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-text">

                                            {row.soldQuantity.toLocaleString('vi-VN')}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-title">

                                            {row.remainingQuantity.toLocaleString('vi-VN')}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-text">

                                            {row.damagedQuantity.toLocaleString('vi-VN')}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-text">

                                            {row.lostQuantity.toLocaleString('vi-VN')}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-text">

                                            {row.voidedQuantity.toLocaleString('vi-VN')}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-text">

                                            {row.returnQuantity.toLocaleString('vi-VN')}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-title" style={{ color: 'var(--palette-success-main)' }}>

                                            {formatImportCost(row.returnValue)} VNĐ

                                        </span>

                                    </TableCell>

                                </TableRow>

                            ))}

                            {inventoryRows.length === 0 && (

                                <TableRow>

                                    <TableCell colSpan={9} align="center" sx={emptyStateCellSx}>

                                        <span className="admin-datagrid-empty">

                                            Chưa có dữ liệu tồn kho theo nhà đài cho kỳ đối soát này.

                                        </span>

                                    </TableCell>

                                </TableRow>

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

                                <TableCell align="center">Mã phiếu</TableCell>

                                <TableCell align="center">Ngày quay</TableCell>

                                <TableCell align="center">Trạng thái</TableCell>

                                <TableCell align="center">Số lượng nhập</TableCell>

                                <TableCell align="center">Giá trị nhập</TableCell>

                                <TableCell align="center" width={80}>

                                    Thao tác

                                </TableCell>

                            </TableRow>

                        </TableHead>

                        <TableBody>

                            {importBatches.map((batch) => (

                                <TableRow key={batch.id} hover>

                                    <TableCell align="center">

                                        <span className="admin-cell-title">

                                            {batch.batchCode || `#${batch.id}`}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-date">

                                            {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className={`admin-status-badge ${getImportBatchStatusBadgeClass(batch.status || undefined)}`}>

                                            {getImportBatchStatusLabel(batch.status || undefined)}

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-text">

                                            {(batch.totalImportedQuantity ?? batch.totalDeclareQuantity ?? 0).toLocaleString('vi-VN')} vé

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <span className="admin-cell-title" style={{ color: 'var(--palette-success-main)' }}>

                                            {formatImportCost(batch.totalImportedCostValue ?? batch.totalDeclaredCostValue)} VNĐ

                                        </span>

                                    </TableCell>

                                    <TableCell align="center">

                                        <Tooltip title="Xem chi tiết phiếu nhập">

                                            <IconButton

                                                size="small"

                                                className="admin-table-action"

                                                onClick={() => router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}

                                            >

                                                <VisibilityOutlinedIcon fontSize="small" />

                                            </IconButton>

                                        </Tooltip>

                                    </TableCell>

                                </TableRow>

                            ))}

                            {importBatches.length === 0 && (

                                <TableRow>

                                    <TableCell colSpan={6} align="center" sx={emptyStateCellSx}>

                                        <span className="admin-datagrid-empty">

                                            Chưa có phiếu nhập lô liên kết kỳ đối soát này.

                                        </span>

                                    </TableCell>

                                </TableRow>

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

                                <TableCell align="center">Mã phiếu</TableCell>

                                <TableCell align="center">Ngày quay</TableCell>

                                <TableCell align="center">Trạng thái</TableCell>

                                <TableCell align="center">Số lượng</TableCell>

                                <TableCell align="center">Giá trị trả</TableCell>

                                <TableCell align="center">Biên lai trả</TableCell>

                                <TableCell align="center" width={80}>

                                    Thao tác

                                </TableCell>

                            </TableRow>

                        </TableHead>

                        <TableBody>

                            {returnBatches.map((batch) => {

                                const hasReceipt = Boolean(batch.returnReceiptEvidenceUrl || batch.returnReceiptUrl);



                                return (

                                    <TableRow key={batch.id} hover>

                                        <TableCell align="center">

                                            <span className="admin-cell-title">#{batch.id}</span>

                                        </TableCell>

                                        <TableCell align="center">

                                            <span className="admin-cell-date">

                                                {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}

                                            </span>

                                        </TableCell>

                                        <TableCell align="center">

                                            <span className={`admin-status-badge ${getReturnBatchStatusBadgeClass(batch.status as any)}`}>

                                                {getReturnBatchStatusLabel(batch.status as any, batch.statusLabel)}

                                            </span>

                                        </TableCell>

                                        <TableCell align="center">

                                            <span className="admin-cell-text">

                                                {(batch.totalQuantity ?? 0).toLocaleString('vi-VN')} vé

                                            </span>

                                        </TableCell>

                                        <TableCell align="center">

                                            <span className="admin-cell-title" style={{ color: 'var(--palette-success-main)' }}>

                                                {formatImportCost(batch.totalReturnValue)} VNĐ

                                            </span>

                                        </TableCell>

                                        <TableCell align="center">

                                            <span

                                                className={`admin-status-badge admin-status-badge--compact ${
                                                    hasReceipt ? 'admin-status-badge--success' : 'admin-status-badge--pending'
                                                }`}
                                            >
                                                {hasReceipt ? 'Có biên lai' : 'Chưa có biên lai'}

                                            </span>

                                        </TableCell>

                                        <TableCell align="center">

                                            <Tooltip title="Xem chi tiết phiếu trả">

                                                <IconButton

                                                    size="small"

                                                    className="admin-table-action"

                                                    onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}

                                                >

                                                    <VisibilityOutlinedIcon fontSize="small" />

                                                </IconButton>

                                            </Tooltip>

                                        </TableCell>

                                    </TableRow>

                                );

                            })}

                            {returnBatches.length === 0 && (

                                <TableRow>

                                    <TableCell colSpan={7} align="center" sx={emptyStateCellSx}>

                                        <span className="admin-datagrid-empty">

                                            Chưa có phiếu trả vé liên kết kỳ đối soát này.

                                        </span>

                                    </TableCell>

                                </TableRow>

                            )}

                        </TableBody>

                    </Table>

                </TableContainer>

            )}

        </Card>

    );

};


