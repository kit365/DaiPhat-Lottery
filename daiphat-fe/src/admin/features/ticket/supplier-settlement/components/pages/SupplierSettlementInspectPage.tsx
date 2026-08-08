"use client";

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useParams } from '@/components/router-compat';
import { AppToast } from '../../../../../../utils/toast.util';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useSupplierSettlementOverview } from '../../hooks/useSupplierSettlement';
import { SettlementDayBatchesPanel } from '../sections/SettlementDayBatchesPanel';
import { SettlementReconciliationTabs } from '../sections/SettlementReconciliationTabs';

const formatDate = (dStr?: string) => {
    if (!dStr) return '';
    return dayjs(dStr).format('DD/MM/YYYY');
};

export const SupplierSettlementInspectPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { data: overview, isLoading, isError, refetch } = useSupplierSettlementOverview(id);

    const settlement = overview?.settlement;
    const kpis = overview?.kpis;
    const importBatches = overview?.importBatches || [];
    const returnBatches = overview?.returnBatches || [];
    const inventoryByStation = overview?.inventoryByStation || [];

    const [auditNotes, setAuditNotes] = useState<string>('');
    const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

    // Calculated totals with smart fallbacks
    const sumStationImport = inventoryByStation.reduce((acc, r) => acc + (r.importedQuantity || 0), 0);
    const sumStationSold = inventoryByStation.reduce((acc, r) => acc + (r.soldQuantity || 0), 0);
    const sumStationRemaining = inventoryByStation.reduce(
        (acc, r) => acc + ((r.remainingQuantity !== undefined && r.remainingQuantity > 0) ? r.remainingQuantity : Math.max(0, (r.importedQuantity || 0) - (r.soldQuantity || 0))),
        0
    );
    const sumStationReturn = inventoryByStation.reduce((acc, r) => acc + (r.returnQuantity || 0), 0);

    const totalImportQty = kpis?.totalImportedTickets || sumStationImport || settlement?.totalImportValue || 0;
    const totalSoldQty = kpis?.totalSoldTickets || sumStationSold || 0;
    const totalRemainingQty = (kpis?.totalRemainingTickets !== undefined && kpis.totalRemainingTickets > 0)
        ? kpis.totalRemainingTickets
        : (totalImportQty > 0 ? (totalImportQty - totalSoldQty) : sumStationRemaining);
    const totalReturnQty = kpis?.totalPreparedForReturnTickets || sumStationReturn || 0;

    const totalImportVal = settlement?.totalImportValue ?? 0;
    const totalReturnVal = settlement?.totalReturnValue ?? 0;
    const remainingAmount = settlement?.remainingAmount ?? (totalImportVal - (settlement?.totalPaidAmount ?? 0));
    const isExpired = Boolean(settlement?.isReturnExpired);

    const diffQty = totalRemainingQty - totalReturnQty;
    const isBalanced = diffQty === 0;

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={360}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !settlement) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={360}>
                <Typography color="text.secondary">Không tìm thấy thông tin đối soát.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            {/* Page Header with Circular Back Button */}
            <div className="mb-[calc(4*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))]">
                <div className="mr-auto">
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <IconButton
                            onClick={() => navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id || ''))}
                            size="small"
                            sx={{
                                bgcolor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#334155',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
                                width: 36,
                                height: 36,
                                '&:hover': {
                                    bgcolor: '#f1f5f9',
                                    borderColor: '#94a3b8',
                                    color: '#0f172a',
                                    transform: 'translateX(-2px)',
                                },
                                transition: 'all 0.15s ease',
                            }}
                            title="Quay lại chi tiết đối soát"
                        >
                            <ArrowBackOutlinedIcon fontSize="small" />
                        </IconButton>
                        <Title title="Kiểm tra & Đối soát thông tin Nhập - Trả vé số" />
                    </Stack>
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                            { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
                            { label: settlement.supplierName || `#${settlement.id}`, to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id || '') },
                            { label: 'Kiểm tra & Đối soát' },
                        ]}
                    />
                </div>
            </div>

            {/* Main Inspection Executive Container */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                }}
            >
                {/* Header Info Banner */}
                <Box sx={{ pb: 2.5, mb: 3, borderBottom: '1px solid #f1f5f9' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '14px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
                                    flexShrink: 0,
                                }}
                            >
                                <ReceiptLongOutlinedIcon sx={{ fontSize: '1.85rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="#0f172a" lineHeight={1.2}>
                                    Phiếu kiểm tra & Đối soát số liệu Nhập - Trả
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Nhà cung cấp: <strong style={{ color: '#0f172a' }}>{settlement.supplierName || '—'}</strong>
                                        {settlement.supplierCode && ` (${settlement.supplierCode})`}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">•</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Mã đối soát:{' '}
                                        <strong style={{ color: '#2563eb' }}>
                                            {settlement.supplierSettlementCode || `#${settlement.id}`}
                                        </strong>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">•</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Kỳ: <strong>{formatDate(settlement.periodFrom)} — {formatDate(settlement.periodTo)}</strong>
                                    </Typography>
                                    {isExpired ? (
                                        <Chip
                                            label="Quá hạn trả vé"
                                            size="small"
                                            sx={{
                                                bgcolor: '#fee2e2',
                                                color: '#991b1b',
                                                fontWeight: 800,
                                                fontSize: '0.725rem',
                                                height: 22,
                                                border: '1px solid #fca5a5',
                                            }}
                                        />
                                    ) : (
                                        <Chip
                                            label="Trong hạn"
                                            size="small"
                                            sx={{
                                                bgcolor: '#dcfce7',
                                                color: '#166534',
                                                fontWeight: 800,
                                                fontSize: '0.725rem',
                                                height: 22,
                                                border: '1px solid #86efac',
                                            }}
                                        />
                                    )}
                                </Stack>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Button
                                variant="outlined"
                                onClick={() => navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id || ''))}
                                startIcon={<ArrowBackOutlinedIcon />}
                                sx={{
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    px: 2.5,
                                    borderColor: '#cbd5e1',
                                    color: '#475569',
                                }}
                            >
                                Quay lại chi tiết
                            </Button>
                        </Stack>
                    </Stack>
                </Box>

                {/* Status Alert Banner */}
                {isBalanced ? (
                    <Alert
                        icon={<CheckCircleOutlinedIcon fontSize="inherit" />}
                        severity="success"
                        sx={{
                            mb: 3,
                            borderRadius: '14px',
                            fontWeight: 600,
                            border: '1px solid #bbf7d0',
                            bgcolor: '#f0fdf4',
                            color: '#166534',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        <strong>Đối soát thành công!</strong> Số lượng vé tồn kho còn lại ({totalRemainingQty.toLocaleString()} vé) hoàn toàn trùng khớp với số lượng vé trên phiếu trả nhà cung cấp ({totalReturnQty.toLocaleString()} vé).
                    </Alert>
                ) : (
                    <Alert
                        icon={<WarningAmberOutlinedIcon fontSize="inherit" />}
                        severity="warning"
                        sx={{
                            mb: 3,
                            borderRadius: '14px',
                            fontWeight: 600,
                            border: '1px solid #fef08a',
                            bgcolor: '#fefce8',
                            color: '#854d0e',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        <strong>Cảnh báo chênh lệch đối soát!</strong> Tồn kho còn lại ({totalRemainingQty.toLocaleString()} vé) chênh lệch <strong>{Math.abs(diffQty).toLocaleString()} vé</strong> so với số vé lập trên phiếu trả ({totalReturnQty.toLocaleString()} vé).
                    </Alert>
                )}

                {/* Executive KPI Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#fafafa',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <Inventory2OutlinedIcon sx={{ fontSize: '1.1rem', color: '#64748b' }} />
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    1. VÉ NHẬP KHO (SÁNG)
                                </Typography>
                            </Stack>
                            <Typography variant="h5" fontWeight={800} color="#0f172a">
                                {totalImportQty.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>vé</span>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                Giá trị nhập: <strong>{formatImportCost(totalImportVal)} VNĐ</strong>
                            </Typography>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#fafafa',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <LocalShippingOutlinedIcon sx={{ fontSize: '1.1rem', color: '#0284c7' }} />
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    2. VÉ ĐÃ BÁN TRONG NGÀY
                                </Typography>
                            </Stack>
                            <Typography variant="h5" fontWeight={800} color="#0284c7">
                                {totalSoldQty.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1' }}>vé</span>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                Tồn còn lại: <strong>{totalRemainingQty.toLocaleString()} vé</strong>
                            </Typography>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#fafafa',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.1rem', color: '#16a34a' }} />
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    3. SỐ VÉ TRÊN PHIẾU TRẢ (CHIỀU)
                                </Typography>
                            </Stack>
                            <Typography variant="h5" fontWeight={800} color="#16a34a">
                                {totalReturnQty.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#15803d' }}>vé</span>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                Trị giá trả: <strong>{formatImportCost(totalReturnVal)} VNĐ</strong>
                            </Typography>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '14px',
                                border: isBalanced ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                bgcolor: isBalanced ? '#fafafa' : '#fff1f2',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <BalanceOutlinedIcon sx={{ fontSize: '1.1rem', color: isBalanced ? '#16a34a' : '#dc2626' }} />
                                <Typography variant="caption" fontWeight={700} color={isBalanced ? '#166534' : '#991b1b'}>
                                    4. CHÊNH LỆCH ĐỐI SOÁT
                                </Typography>
                            </Stack>
                            <Typography variant="h5" fontWeight={800} color={isBalanced ? '#15803d' : '#dc2626'}>
                                {Math.abs(diffQty).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isBalanced ? '#166534' : '#b91c1c' }}>vé</span>
                            </Typography>
                            <Chip
                                size="small"
                                label={isBalanced ? 'Khớp số liệu 100%' : `Lệch ${Math.abs(diffQty)} vé`}
                                color={isBalanced ? 'success' : 'error'}
                                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, mt: 0.25 }}
                            />
                        </Card>
                    </Grid>
                </Grid>

                <SettlementReconciliationTabs
                    inventoryByStation={inventoryByStation}
                    importBatches={importBatches}
                    returnBatches={returnBatches}
                    remainingPayableAmount={remainingAmount}
                />

                <SettlementDayBatchesPanel
                    settlementId={settlement.id}
                    supplierSettlementCode={settlement.supplierSettlementCode}
                    supplierSettlementReceiptUrl={settlement.supplierSettlementReceiptUrl}
                    importBatches={importBatches}
                    onRefresh={() => { void refetch(); }}
                    onZoomImage={setZoomImage}
                />

                {/* Inspection Notes / Audit Remarks Input Box */}
                <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', mb: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <EditNoteOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.4rem' }} />
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                            Ghi chú kiểm tra & Biên bản đối soát (Kế toán / Quản lý)
                        </Typography>
                    </Stack>
                    <TextField
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Nhập ghi chú kiểm đếm, nguyên nhân chênh lệch hoặc ghi chú biên bản đối soát (nếu có)..."
                        value={auditNotes}
                        onChange={(e) => setAuditNotes(e.target.value)}
                        sx={{ bgcolor: '#f8fafc' }}
                    />
                </Card>

                {/* Page Footer Action Bar */}
                <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ pt: 2, borderTop: '1px solid #f1f5f9' }}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id || ''))}
                        startIcon={<ArrowBackOutlinedIcon />}
                        sx={{
                            borderRadius: '10px',
                            textTransform: 'none',
                            px: 3,
                            fontWeight: 700,
                            color: '#475569',
                            borderColor: '#cbd5e1',
                        }}
                    >
                        Quay lại chi tiết
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            AppToast.success('Đã xác nhận kiểm tra và hoàn tất đối soát nhà cung cấp!');
                            navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id || ''));
                        }}
                        sx={{
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 800,
                            px: 4,
                            py: 1,
                            bgcolor: '#2563eb',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        Xác nhận hoàn tất đối soát
                    </Button>
                </Stack>
            </Paper>

            {/* Image Zoom Lightbox Modal */}
            <Dialog
                open={Boolean(zoomImage)}
                onClose={() => setZoomImage(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        overflow: 'hidden',
                        bgcolor: '#0f172a',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        bgcolor: '#1e293b',
                        color: '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #334155',
                    }}
                >
                    <Typography variant="subtitle1" fontWeight={800} color="#f8fafc">
                        {zoomImage?.title || 'Xem ảnh biên lai'}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setZoomImage(null)}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff', bgcolor: '#334155' } }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent
                    sx={{
                        p: 3,
                        bgcolor: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 400,
                    }}
                >
                    {zoomImage?.url && (
                        <Box
                            component="img"
                            src={zoomImage.url}
                            alt={zoomImage.title || 'Biên lai'}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '75vh',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};
