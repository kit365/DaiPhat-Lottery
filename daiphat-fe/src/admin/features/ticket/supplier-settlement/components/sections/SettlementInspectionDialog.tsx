"use client";

import { useState } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
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
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Stack,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
} from '@mui/material';
import { AppToast } from '../../../../../../utils/toast.util';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import type {
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
    SupplierSettlement,
    SupplierSettlementKpis,
} from '../../types/supplierSettlement.type';
import { SettlementDayBatchesPanel } from './SettlementDayBatchesPanel';
import { SettlementReconciliationTabs } from './SettlementReconciliationTabs';

interface SettlementInspectionDialogProps {
    open: boolean;
    onClose: () => void;
    settlement: SupplierSettlement;
    kpis: SupplierSettlementKpis;
    importBatches: SettlementOverviewImportBatch[];
    returnBatches: SettlementOverviewReturnBatch[];
    inventoryByStation?: SettlementStationInventory[];
    onRefresh?: () => void;
}

const formatDate = (dStr?: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
};

export const SettlementInspectionDialog = ({
    open,
    onClose,
    settlement,
    kpis,
    importBatches = [],
    returnBatches = [],
    inventoryByStation = [],
    onRefresh,
}: SettlementInspectionDialogProps) => {
    const [inspectStep, setInspectStep] = useState<'CHECK' | 'RECEIPTS'>('CHECK');
    const [auditNotes, setAuditNotes] = useState<string>('');
    const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

    const handleClose = () => {
        setInspectStep('CHECK');
        onClose();
    };

    // Calculated totals with smart fallbacks
    const sumStationImport = inventoryByStation.reduce((acc, r) => acc + (r.importedQuantity || 0), 0);
    const sumStationSold = inventoryByStation.reduce((acc, r) => acc + (r.soldQuantity || 0), 0);
    const sumStationRemaining = inventoryByStation.reduce(
        (acc, r) => acc + ((r.remainingQuantity !== undefined && r.remainingQuantity > 0) ? r.remainingQuantity : Math.max(0, (r.importedQuantity || 0) - (r.soldQuantity || 0))),
        0
    );
    const sumStationReturn = inventoryByStation.reduce((acc, r) => acc + (r.returnQuantity || 0), 0);

    const totalImportQty = kpis?.totalImportedTickets || sumStationImport || 0;
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

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="lg"
                fullWidth
                scroll="paper"
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    },
                }}
            >
                <DialogTitle component="div" sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9', bgcolor: '#ffffff' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box
                                sx={{
                                    width: 46,
                                    height: 46,
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
                                <ReceiptLongOutlinedIcon sx={{ fontSize: '1.75rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="#0f172a" lineHeight={1.2}>
                                    Phiếu kiểm tra & Đối soát số liệu Nhập - Trả
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Nhà cung cấp: <strong style={{ color: '#0f172a' }}>{settlement?.supplierName || '—'}</strong>
                                        {settlement?.supplierCode && ` (${settlement.supplierCode})`}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">•</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Mã đối soát:{' '}
                                        <strong style={{ color: '#2563eb' }}>
                                            {settlement?.supplierSettlementCode || `#${settlement?.id}`}
                                        </strong>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">•</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Kỳ: <strong>{formatDate(settlement?.periodFrom)} — {formatDate(settlement?.periodTo)}</strong>
                                    </Typography>
                                    {isExpired ? (
                                        <Chip
                                            label="Quá hạn trả vé"
                                            size="small"
                                            sx={{
                                                bgcolor: '#fee2e2',
                                                color: '#991b1b',
                                                fontWeight: 800,
                                                fontSize: '0.675rem',
                                                height: 20,
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
                                                fontSize: '0.675rem',
                                                height: 20,
                                                border: '1px solid #86efac',
                                            }}
                                        />
                                    )}
                                </Stack>
                            </Box>
                        </Stack>
                        <IconButton
                            size="small"
                            onClick={handleClose}
                            sx={{
                                color: '#64748b',
                                bgcolor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ p: 3, bgcolor: '#fafafa' }}>
                    <Stepper
                        activeStep={inspectStep === 'CHECK' ? 0 : 1}
                        sx={{
                            mb: 2.5,
                            '& .MuiStepLabel-label': { fontWeight: 700, fontSize: '0.8rem' },
                        }}
                    >
                        <Step>
                            <StepLabel>Phiếu kiểm tra & biên bản</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Đối chiếu biên lai</StepLabel>
                        </Step>
                    </Stepper>

                    {inspectStep === 'CHECK' && (
                        <>
                            {isBalanced ? (
                                <Alert
                                    icon={<CheckCircleOutlinedIcon fontSize="inherit" />}
                                    severity="success"
                                    sx={{
                                        mb: 2.5,
                                        borderRadius: '14px',
                                        fontWeight: 600,
                                        border: '1px solid #bbf7d0',
                                        bgcolor: '#f0fdf4',
                                        color: '#166534',
                                    }}
                                >
                                    <strong>Đối soát thành công!</strong> Số lượng vé tồn kho còn lại ({totalRemainingQty.toLocaleString()} vé) hoàn toàn trùng khớp với số lượng vé trên phiếu trả nhà cung cấp ({totalReturnQty.toLocaleString()} vé).
                                </Alert>
                            ) : (
                                <Alert
                                    icon={<WarningAmberOutlinedIcon fontSize="inherit" />}
                                    severity="warning"
                                    sx={{
                                        mb: 2.5,
                                        borderRadius: '14px',
                                        fontWeight: 600,
                                        border: '1px solid #fef08a',
                                        bgcolor: '#fefce8',
                                        color: '#854d0e',
                                    }}
                                >
                                    <strong>Cảnh báo chênh lệch đối soát!</strong> Tồn kho còn lại ({totalRemainingQty.toLocaleString()} vé) chênh lệch <strong>{Math.abs(diffQty).toLocaleString()} vé</strong> so với số vé lập trên phiếu trả ({totalReturnQty.toLocaleString()} vé).
                                </Alert>
                            )}

                            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Card elevation={0} sx={{ p: 2, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
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
                                    <Card elevation={0} sx={{ p: 2, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
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
                                    <Card elevation={0} sx={{ p: 2, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
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
                                            p: 2,
                                            borderRadius: '14px',
                                            border: isBalanced ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                            bgcolor: isBalanced ? '#ffffff' : '#fff1f2',
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
                                settlement={settlement}
                            />

                            <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                    <EditNoteOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.4rem' }} />
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Ghi chú kiểm tra & Biên bản đối soát (Kế toán / Quản lý)
                                    </Typography>
                                </Stack>
                                <TextField
                                    multiline
                                    rows={2}
                                    fullWidth
                                    placeholder="Nhập ghi chú kiểm đếm, nguyên nhân chênh lệch hoặc ghi chú biên bản đối soát (nếu có)..."
                                    value={auditNotes}
                                    onChange={(e) => setAuditNotes(e.target.value)}
                                    sx={{ bgcolor: '#f8fafc' }}
                                />
                            </Card>
                        </>
                    )}

                    {inspectStep === 'RECEIPTS' && (
                        <SettlementDayBatchesPanel
                            settlementId={settlement.id}
                            supplierSettlementCode={settlement.supplierSettlementCode}
                            supplierSettlementReceiptUrl={settlement.supplierSettlementReceiptUrl}
                            importBatches={importBatches}
                            onRefresh={onRefresh}
                            onZoomImage={setZoomImage}
                        />
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                    {inspectStep === 'CHECK' ? (
                        <>
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={handleClose}
                                sx={{
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    px: 3,
                                    fontWeight: 700,
                                    color: '#475569',
                                    borderColor: '#cbd5e1',
                                }}
                            >
                                Đóng
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => setInspectStep('RECEIPTS')}
                                endIcon={<ArrowForwardOutlinedIcon />}
                                sx={{
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    px: 3.5,
                                    py: 1,
                                    bgcolor: '#2563eb',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                Tiếp tục
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={() => setInspectStep('CHECK')}
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
                                Quay lại
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    AppToast.success('Đã xác nhận kiểm tra và hoàn tất đối soát nhà cung cấp!');
                                    handleClose();
                                }}
                                sx={{
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    px: 3.5,
                                    py: 1,
                                    bgcolor: '#2563eb',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                Xác nhận hoàn tất đối soát
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

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
        </>
    );
};
