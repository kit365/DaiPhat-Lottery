import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import {
    Box,
    Card,
    Chip,
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
import { useState } from 'react';
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

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#fff',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
            }}
        >
            {/* Header with Tabs Navigation */}
            <Box
                sx={{
                    borderBottom: '1px solid #e2e8f0',
                    px: 3,
                    pt: 0.5,
                    bgcolor: '#fafafa',
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        minHeight: 42,
                        '& .MuiTab-root': {
                            minHeight: 42,
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            px: 2,
                            mr: 1,
                        },
                    }}
                >
                    <Tab
                        icon={<Inventory2OutlinedIcon sx={{ fontSize: '1.05rem' }} />}
                        iconPosition="start"
                        label={
                            <Stack direction="row" spacing={1} alignItems="center">
                                <span>Tồn kho theo nhà đài</span>
                                <Chip
                                    label={inventoryRows.length}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        bgcolor: activeTab === 0 ? '#eff6ff' : '#f1f5f9',
                                        color: activeTab === 0 ? '#2563eb' : '#64748b',
                                    }}
                                />
                            </Stack>
                        }
                    />
                    <Tab
                        icon={<MoveToInboxOutlinedIcon sx={{ fontSize: '1.05rem' }} />}
                        iconPosition="start"
                        label={
                            <Stack direction="row" spacing={1} alignItems="center">
                                <span>Phiếu nhập lô</span>
                                <Chip
                                    label={importBatches.length}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        bgcolor: activeTab === 1 ? '#eff6ff' : '#f1f5f9',
                                        color: activeTab === 1 ? '#2563eb' : '#64748b',
                                    }}
                                />
                            </Stack>
                        }
                    />
                    <Tab
                        icon={<AssignmentReturnOutlinedIcon sx={{ fontSize: '1.05rem' }} />}
                        iconPosition="start"
                        label={
                            <Stack direction="row" spacing={1} alignItems="center">
                                <span>Phiếu trả vé</span>
                                <Chip
                                    label={returnBatches.length}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        bgcolor: activeTab === 2 ? '#eff6ff' : '#f1f5f9',
                                        color: activeTab === 2 ? '#2563eb' : '#64748b',
                                    }}
                                />
                            </Stack>
                        }
                    />
                </Tabs>
            </Box>

            {/* Tab 0: Tồn kho theo nhà đài */}
            {activeTab === 0 && (
                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="medium">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Nhà đài</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Nhập</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Đã bán</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Còn lại</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Hỏng</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Thất lạc</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Hủy số</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Trả</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#166534' }}>Giá trị trả</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {inventoryRows.map((row) => (
                                <TableRow key={row.lotteryStationId} hover>
                                    <TableCell>
                                        <Typography fontWeight={700} color="#0f172a">
                                            {row.lotteryStationName || `#${row.lotteryStationId}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: '#334155' }}>
                                        {row.importedQuantity.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: '#334155' }}>
                                        {row.soldQuantity.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#15803d' }}>
                                        {row.remainingQuantity.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: row.damagedQuantity > 0 ? '#334155' : '#94a3b8' }}>
                                        {row.damagedQuantity.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: row.lostQuantity > 0 ? '#334155' : '#94a3b8' }}>
                                        {row.lostQuantity.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: row.voidedQuantity > 0 ? '#334155' : '#94a3b8' }}>
                                        {row.voidedQuantity.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: '#334155' }}>
                                        {row.returnQuantity.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#166534' }}>
                                        {formatImportCost(row.returnValue)} VNĐ
                                    </TableCell>
                                </TableRow>
                            ))}
                            {inventoryRows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">
                                        <Typography color="text.secondary" sx={{ py: 4 }}>
                                            Chưa có dữ liệu tồn kho theo nhà đài cho kỳ đối soát này.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Tab 1: Phiếu nhập lô */}
            {activeTab === 1 && (
                <TableContainer>
                    <Table size="medium">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Mã phiếu</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Ngày quay</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Trạng thái</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Số lượng nhập</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#166534' }}>Giá trị nhập</TableCell>
                                <TableCell align="center" width={80} sx={{ fontWeight: 700, color: '#334155' }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {importBatches.map((batch) => (
                                <TableRow key={batch.id} hover>
                                    <TableCell>
                                        <Typography fontWeight={700} color="#0f172a">
                                            {batch.batchCode || `#${batch.id}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 500, color: '#334155' }}>
                                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`admin-status-badge ${getImportBatchStatusBadgeClass(batch.status || undefined)}`}>
                                            {getImportBatchStatusLabel(batch.status || undefined)}
                                        </span>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                        {(batch.totalImportedQuantity ?? batch.totalDeclareQuantity ?? 0).toLocaleString('vi-VN')} vé
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#166534' }}>
                                        {formatImportCost(batch.totalImportedCostValue ?? batch.totalDeclaredCostValue)} VNĐ
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Xem chi tiết phiếu nhập">
                                            <IconButton
                                                size="small"
                                                color="primary"
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
                                    <TableCell colSpan={6} align="center">
                                        <Typography color="text.secondary" sx={{ py: 4 }}>
                                            Chưa có phiếu nhập lô liên kết kỳ đối soát này.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Tab 2: Phiếu trả vé */}
            {activeTab === 2 && (
                <TableContainer>
                    <Table size="medium">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Mã phiếu</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Ngày quay</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Trạng thái</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Số lượng</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#166534' }}>Giá trị trả</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: '#334155' }}>Biên lai trả</TableCell>
                                <TableCell align="center" width={80} sx={{ fontWeight: 700, color: '#334155' }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {returnBatches.map((batch) => (
                                <TableRow key={batch.id} hover>
                                    <TableCell>
                                        <Typography fontWeight={700} color="#0f172a">#{batch.id}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 500, color: '#334155' }}>
                                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`admin-status-badge ${getReturnBatchStatusBadgeClass(batch.status as any)}`}>
                                            {getReturnBatchStatusLabel(batch.status as any, batch.statusLabel)}
                                        </span>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                        {(batch.totalQuantity ?? 0).toLocaleString('vi-VN')} vé
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#166534' }}>
                                        {formatImportCost(batch.totalReturnValue)} VNĐ
                                    </TableCell>
                                    <TableCell align="center">
                                        {batch.returnReceiptEvidenceUrl || batch.returnReceiptUrl ? (
                                            <Chip
                                                label="Có biên lai"
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                                            />
                                        ) : (
                                            <Chip
                                                label="Chưa có"
                                                size="small"
                                                color="default"
                                                variant="outlined"
                                                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 500 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Xem chi tiết phiếu trả">
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                                            >
                                                <VisibilityOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {returnBatches.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Typography color="text.secondary" sx={{ py: 4 }}>
                                            Chưa có phiếu trả vé liên kết kỳ đối soát này.
                                        </Typography>
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
