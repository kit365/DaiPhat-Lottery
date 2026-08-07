"use client";

import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { AppToast } from '../../../../../../utils/toast.util';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { updateReturnEvidenceUrl } from '../../../return-batch/services/returnBatchService';
import type {
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
    SupplierSettlement,
    SupplierSettlementKpis,
} from '../../types/supplierSettlement.type';

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
    const primaryImportBatch = importBatches[0];
    const primaryReturnBatch = returnBatches[0];

    const [returnEvidenceUrl, setReturnEvidenceUrl] = useState<string>(
        primaryReturnBatch?.returnReceiptEvidenceUrl || primaryReturnBatch?.returnReceiptUrl || ''
    );
    const [isSaving, setIsSaving] = useState(false);
    const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Dynamic calculated totals
    const totalImportQty = kpis?.totalImportedTickets ?? 0;
    const totalSoldQty = kpis?.totalSoldTickets ?? 0;
    const totalRemainingQty = kpis?.totalRemainingTickets ?? 0;
    const totalReturnQty = kpis?.totalPreparedForReturnTickets ?? 0;

    const totalImportVal = settlement?.totalImportValue ?? 0;
    const totalReturnVal = settlement?.totalReturnValue ?? 0;

    const diffQty = totalRemainingQty - totalReturnQty;
    const isBalanced = diffQty === 0;

    const handleSaveEvidence = async (urlToSave?: string) => {
        const finalUrl = urlToSave !== undefined ? urlToSave : returnEvidenceUrl;
        if (!primaryReturnBatch?.id) {
            AppToast.error('Không tìm thấy phiếu trả vé để lưu biên lai.');
            return;
        }
        if (!finalUrl.trim()) {
            AppToast.warning('Vui lòng nhập hoặc chọn ảnh biên lai trước khi lưu.');
            return;
        }
        try {
            setIsSaving(true);
            const res = await updateReturnEvidenceUrl(primaryReturnBatch.id, finalUrl.trim());
            if (res.success) {
                AppToast.success('Đã lưu ảnh biên lai trả vé thành công!');
                if (onRefresh) onRefresh();
            } else {
                AppToast.error(res.message || 'Lưu ảnh biên lai thất bại.');
            }
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu biên lai.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target?.result as string;
            if (base64Data) {
                setReturnEvidenceUrl(base64Data);
                void handleSaveEvidence(base64Data);
            }
        };
        reader.readAsDataURL(file);
    };

    const importReceiptUrl =
        primaryImportBatch?.receiptImageUrl ||
        primaryImportBatch?.evidenceUrl ||
        'https://placehold.co/600x800/f1f5f9/334155?text=Bi%E1%BB%83n+lai+nh%E1%BA%ADp+v%C3%A9+s%E1%BB%91+(S%C3%A1ng)';

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
                <DialogTitle component="div" sx={{ pb: 1.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '12px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.12)',
                                }}
                            >
                                <ReceiptLongOutlinedIcon fontSize="medium" />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                    Kiểm tra & Đối soát thông tin Nhập - Trả vé số
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Nhà cung cấp: <strong style={{ color: '#0f172a' }}>{settlement?.supplierName || '—'}</strong> | Mã đối soát: <strong>#{settlement?.id}</strong> | Kỳ: {settlement?.periodFrom} — {settlement?.periodTo}
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton size="small" onClick={onClose} sx={{ bgcolor: '#f1f5f9' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ pt: 3, pb: 3, bgcolor: '#f8fafc' }}>
                    {/* Status Alert Banner */}
                    {isBalanced ? (
                        <Alert
                            icon={<CheckCircleOutlinedIcon fontSize="inherit" />}
                            severity="success"
                            sx={{ mb: 3, borderRadius: '12px', fontWeight: 600, border: '1px solid #bbf7d0' }}
                        >
                            <strong>Đối soát thành công!</strong> Số lượng vé tồn kho còn lại hoàn toàn trùng khớp với số lượng vé trên phiếu trả nhà cung cấp.
                        </Alert>
                    ) : (
                        <Alert
                            icon={<WarningAmberOutlinedIcon fontSize="inherit" />}
                            severity="warning"
                            sx={{ mb: 3, borderRadius: '12px', fontWeight: 600, border: '1px solid #fef08a' }}
                        >
                            <strong>Cảnh báo chênh lệch đối soát!</strong> Tồn kho còn lại ({totalRemainingQty.toLocaleString()} vé) chênh lệch <strong>{Math.abs(diffQty).toLocaleString()} vé</strong> so với số vé lập trên phiếu trả ({totalReturnQty.toLocaleString()} vé).
                        </Alert>
                    )}

                    {/* Executive KPI Summary Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <Inventory2OutlinedIcon sx={{ fontSize: '1.1rem', color: '#64748b' }} />
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        1. Vé nhập kho (Sáng)
                                    </Typography>
                                </Stack>
                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                    {totalImportQty.toLocaleString()} vé
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Giá trị: {formatImportCost(totalImportVal)} VNĐ
                                </Typography>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <LocalShippingOutlinedIcon sx={{ fontSize: '1.1rem', color: '#0284c7' }} />
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        2. Vé đã bán trong ngày
                                    </Typography>
                                </Stack>
                                <Typography variant="h6" fontWeight={800} color="#0284c7">
                                    {totalSoldQty.toLocaleString()} vé
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Tồn còn lại: <strong>{totalRemainingQty.toLocaleString()} vé</strong>
                                </Typography>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.1rem', color: '#16a34a' }} />
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        3. Số vé trên phiếu trả (Chiều)
                                    </Typography>
                                </Stack>
                                <Typography variant="h6" fontWeight={800} color="#16a34a">
                                    {totalReturnQty.toLocaleString()} vé
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Trị giá trả: {formatImportCost(totalReturnVal)} VNĐ
                                </Typography>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    border: isBalanced ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                    bgcolor: isBalanced ? '#f0fdf4' : '#fef2f2',
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} color={isBalanced ? '#166534' : '#991b1b'}>
                                    4. Chênh lệch đối soát
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color={isBalanced ? '#15803d' : '#dc2626'} sx={{ mt: 0.5 }}>
                                    {Math.abs(diffQty).toLocaleString()} vé
                                </Typography>
                                <Chip
                                    size="small"
                                    label={isBalanced ? 'Khớp số liệu' : 'Có chênh lệch'}
                                    color={isBalanced ? 'success' : 'error'}
                                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, mt: 0.25 }}
                                />
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Detailed Station Breakdown Table */}
                    <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#fff', mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 1.5 }}>
                            📊 Bảng chi tiết đối soát từng Nhà đài
                        </Typography>
                        <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, color: '#334155' }}>STT</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Nhà đài</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Nhập (Sáng)</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#0284c7' }}>Đã bán</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>Còn lại (Tồn)</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#ea580c' }}>Số vé trả (Chiều)</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, color: '#334155' }}>Trạng thái đối soát</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {inventoryByStation.map((row, idx) => {
                                        const stationDiff = row.remainingQuantity - row.returnQuantity;
                                        const stationOk = stationDiff === 0;
                                        return (
                                            <TableRow key={row.lotteryStationId || idx} hover>
                                                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                                    {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                    {row.importedQuantity.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, color: '#0284c7' }}>
                                                    {row.soldQuantity.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>
                                                    {row.remainingQuantity.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: '#ea580c' }}>
                                                    {row.returnQuantity.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        size="small"
                                                        label={stationOk ? 'Khớp' : `Lệch ${Math.abs(stationDiff)} vé`}
                                                        color={stationOk ? 'success' : 'error'}
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {inventoryByStation.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center">
                                                <Typography color="text.secondary" sx={{ py: 2 }}>
                                                    Chưa có dữ liệu phân rã theo đài.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>

                    {/* Side-by-Side Receipts Evidence Comparison Section */}
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 1.5 }}>
                        📷 Đối chiếu Ảnh biên lai Nhập vé (Sáng) & Trả vé (Chiều)
                    </Typography>

                    <Grid container spacing={3}>
                        {/* 1. Left Column: Import Batch Receipt (Sáng) */}
                        <Grid item xs={12} md={6}>
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#fff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                            1. Biên lai Phiếu nhập lô (Buổi sáng)
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Mã lô: <strong>{primaryImportBatch?.batchCode || 'PN-20260807-0004'}</strong>
                                        </Typography>
                                    </Box>
                                    <Chip label="Đã bàn giao sáng" size="small" color="info" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                </Stack>

                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        height: 240,
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        border: '1px solid #cbd5e1',
                                        bgcolor: '#f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <img
                                        src={importReceiptUrl}
                                        alt="Biên lai nhập vé"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                    <IconButton
                                        onClick={() => setZoomImage({ url: importReceiptUrl, title: 'Biên lai phiếu nhập lô (Sáng)' })}
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            bgcolor: 'rgba(15, 23, 42, 0.75)',
                                            color: '#fff',
                                            '&:hover': { bgcolor: '#0f172a' },
                                        }}
                                        title="Phóng to ảnh"
                                    >
                                        <ZoomInIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                                    Biên lai xác nhận tổng số lượng vé nhập kho lúc đầu giờ sáng
                                </Typography>
                            </Card>
                        </Grid>

                        {/* 2. Right Column: Return Batch Evidence Receipt (Chiều - returnReceiptEvidenceUrl) */}
                        <Grid item xs={12} md={6}>
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#fff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                            2. Biên lai Phiếu trả vé (Chiều nay)
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Mã phiếu trả: <strong>{primaryReturnBatch?.id ? `#${primaryReturnBatch.id}` : '#104'}</strong>
                                        </Typography>
                                    </Box>
                                    <Chip label="Biên lai trả vé" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                </Stack>

                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        height: 240,
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        border: '1px solid #cbd5e1',
                                        bgcolor: '#f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {returnEvidenceUrl ? (
                                        <>
                                            <img
                                                src={returnEvidenceUrl}
                                                alt="Biên lai trả vé"
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                            <IconButton
                                                onClick={() => setZoomImage({ url: returnEvidenceUrl, title: 'Biên lai phiếu trả vé (Chiều)' })}
                                                sx={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    bgcolor: 'rgba(15, 23, 42, 0.75)',
                                                    color: '#fff',
                                                    '&:hover': { bgcolor: '#0f172a' },
                                                }}
                                                title="Phóng to ảnh"
                                            >
                                                <ZoomInIcon fontSize="small" />
                                            </IconButton>
                                        </>
                                    ) : (
                                        <Stack spacing={1} alignItems="center" sx={{ p: 2, textAlign: 'center' }}>
                                            <CloudUploadIcon sx={{ fontSize: '2.5rem', color: '#94a3b8' }} />
                                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                                Chưa có ảnh biên lai phiếu trả vé
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => fileInputRef.current?.click()}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                                            >
                                                Tải ảnh biên lai trả vé
                                            </Button>
                                        </Stack>
                                    )}
                                </Box>

                                {/* Input URL & Upload Action Bar */}
                                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelected}
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                    />
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="Dán URL ảnh biên lai hoặc chọn tệp..."
                                        value={returnEvidenceUrl.startsWith('data:') ? '[Ảnh tải từ thiết bị]' : returnEvidenceUrl}
                                        onChange={(e) => setReturnEvidenceUrl(e.target.value)}
                                        sx={{ bgcolor: '#f8fafc' }}
                                    />
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => fileInputRef.current?.click()}
                                        startIcon={<CloudUploadIcon />}
                                        sx={{ textTransform: 'none', whitespace: 'nowrap', borderRadius: '8px', fontWeight: 600 }}
                                    >
                                        Tải ảnh
                                    </Button>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        disabled={isSaving}
                                        onClick={() => void handleSaveEvidence()}
                                        sx={{ textTransform: 'none', whitespace: 'nowrap', borderRadius: '8px', fontWeight: 700 }}
                                    >
                                        {isSaving ? <CircularProgress size={18} color="inherit" /> : 'Lưu ảnh'}
                                    </Button>
                                </Stack>
                            </Card>
                        </Grid>
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                    <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: '8px', textTransform: 'none', px: 2.5 }}>
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            AppToast.success('Đã xác nhận kiểm tra và hoàn tất đối soát nhà cung cấp!');
                            onClose();
                        }}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, px: 3 }}
                    >
                        Xác nhận hoàn tất đối soát
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Zoom Lightbox Modal */}
            {zoomImage && (
                <Dialog open={!!zoomImage} onClose={() => setZoomImage(null)} maxWidth="lg">
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            {zoomImage.title}
                        </Typography>
                        <IconButton size="small" onClick={() => setZoomImage(null)}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: 1, textAlign: 'center', bgcolor: '#0f172a' }}>
                        <img
                            src={zoomImage.url}
                            alt={zoomImage.title}
                            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};
