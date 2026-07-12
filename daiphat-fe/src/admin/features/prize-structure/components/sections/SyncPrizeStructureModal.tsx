import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    Chip,
    Paper,
    Alert,
    AlertTitle
} from '@mui/material';
import { useApprovePrizeStructurePreview, useSyncPrizeStructure } from '../../hooks/usePrizeStructure';
import { toast } from 'react-toastify';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { PrizeStructureSyncItem, PrizeStructureSyncResponse, PrizeStructureSource } from '../../types/prize-structure';

interface SyncPrizeStructureModalProps {
    open: boolean;
    onClose: () => void;
}

export const SyncPrizeStructureModal: React.FC<SyncPrizeStructureModalProps> = ({ open, onClose }) => {
    const { mutate: syncPrizeStructure, isPending } = useSyncPrizeStructure();
    const { mutate: approvePreview, isPending: isApproving } = useApprovePrizeStructurePreview();

    const [source, setSource] = useState<PrizeStructureSource>('MINH_NGOC');
    const [region, setRegion] = useState('MIEN_NAM');
    const [preview, setPreview] = useState<PrizeStructureSyncResponse | null>(null);
    const [draftItems, setDraftItems] = useState<PrizeStructureSyncItem[]>([]);

    const handleSubmit = () => {
        syncPrizeStructure(
            { source, region },
            {
                onSuccess: (res) => {
                    const data = res.data as PrizeStructureSyncResponse;
                    toast.success(
                        `Đồng bộ thành công! (Tạo: ${data.createdCount}, Cập nhật: ${data.updatedCount}, Xóa: ${data.deletedCount}, Bỏ qua: ${data.skippedCount})`
                    );
                    if (data?.warnings?.length > 0) {
                        toast.warning(`Có ${data.warnings.length} cảnh báo. Vui lòng kiểm tra lại.`);
                    }
                    setPreview(data);
                    setDraftItems(data.items.filter(item => item.action !== 'DELETED'));
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Đồng bộ thất bại');
                }
            }
        );
    };

    const updateDraftItem = (index: number, field: keyof PrizeStructureSyncItem, value: string | number) => {
        setDraftItems(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
    };

    const handleApprove = () => {
        approvePreview(
            {
                region,
                items: draftItems.map(({ prizeStructureId, action, note, ...item }) => item),
            },
            {
                onSuccess: () => {
                    toast.success('Đã xác nhận và lưu cơ cấu giải thưởng.');
                    setPreview(null);
                    onClose();
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Không thể lưu cơ cấu giải thưởng'),
            },
        );
    };

    const handleClose = () => {
        if (isPending || isApproving) return;
        setPreview(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={isPending || isApproving ? undefined : handleClose} maxWidth={preview ? 'lg' : 'sm'} fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>{preview ? 'Xem trước cơ cấu giải thưởng' : 'Đồng bộ Cơ cấu giải thưởng'}</DialogTitle>
            <DialogContent>
                {!preview ? <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Nguồn dữ liệu</InputLabel>
                        <Select
                            value={source}
                            label="Nguồn dữ liệu"
                            onChange={(e) => setSource(e.target.value as PrizeStructureSource)}
                            disabled={isPending}
                        >
                            <MenuItem value="MINH_NGOC">Minh Ngọc</MenuItem>
                            <MenuItem value="XOSO_VN">Xoso.vn</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Vùng miền</InputLabel>
                        <Select
                            value={region}
                            label="Vùng miền"
                            onChange={(e) => setRegion(e.target.value)}
                            disabled={isPending}
                        >
                            <MenuItem value="MIEN_NAM">Miền Nam</MenuItem>
                            <MenuItem value="MIEN_TRUNG" disabled>Miền Trung (Đang phát triển)</MenuItem>
                            <MenuItem value="MIEN_BAC" disabled>Miền Bắc (Đang phát triển)</MenuItem>
                        </Select>
                    </FormControl>
                </Box> : (
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            <AlertTitle sx={{ fontWeight: 600 }}>Cào được {preview.totalFetched} giải</AlertTitle>
                            Thêm mới: <b>{preview.createdCount}</b>, Cập nhật: <b>{preview.updatedCount}</b>, Giữ nguyên: <b>{preview.skippedCount}</b>, Sẽ xóa: <b>{preview.deletedCount}</b>.
                            {preview.requestUrl && (
                                <Box component="span" sx={{ ml: 1 }}>
                                    <a className="text-[var(--palette-primary-main)] underline font-medium" href={preview.requestUrl} target="_blank" rel="noreferrer">
                                        Mở nguồn cào
                                    </a>
                                </Box>
                            )}
                        </Alert>

                        <TableContainer
                            component={Paper}
                            variant="outlined"
                            sx={{
                                maxHeight: '52vh',
                                borderRadius: 2,
                                border: '1px solid var(--palette-divider)',
                                boxShadow: 'none'
                            }}
                        >
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'background.paper', zIndex: 10 }}>
                                        <TableCell sx={{ bgcolor: 'background.paper', zIndex: 10 }}>Giải</TableCell>
                                        <TableCell sx={{ bgcolor: 'background.paper', zIndex: 10 }}>Tên</TableCell>
                                        <TableCell sx={{ bgcolor: 'background.paper', zIndex: 10 }}>Giá trị (VNĐ)</TableCell>
                                        <TableCell sx={{ bgcolor: 'background.paper', zIndex: 10 }}>SL</TableCell>
                                        <TableCell sx={{ bgcolor: 'background.paper', zIndex: 10 }}>Trạng thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {draftItems.map((item, index) => {
                                        let chipColor: 'default' | 'success' | 'info' | 'warning' | 'error' = 'default';
                                        let chipLabel = item.action;
                                        if (item.action === 'CREATED') { chipColor = 'success'; chipLabel = 'Thêm mới'; }
                                        else if (item.action === 'UPDATED') { chipColor = 'info'; chipLabel = 'Cập nhật'; }
                                        else if (item.action === 'SKIPPED') { chipColor = 'default'; chipLabel = 'Giữ nguyên'; }
                                        else if (item.action === 'DELETED') { chipColor = 'error'; chipLabel = 'Sẽ xóa'; }

                                        return (
                                            <TableRow key={`${item.prizeCode}-${index}`} hover>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        value={item.prizeCode}
                                                        onChange={(e) => updateDraftItem(index, 'prizeCode', e.target.value)}
                                                        sx={{ width: 100 }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        value={item.prizeDisplayName}
                                                        onChange={(e) => updateDraftItem(index, 'prizeDisplayName', e.target.value)}
                                                        sx={{ minWidth: 200 }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={item.prizeValue}
                                                        onChange={(e) => updateDraftItem(index, 'prizeValue', Number(e.target.value))}
                                                        sx={{ width: 140 }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateDraftItem(index, 'quantity', Number(e.target.value))}
                                                        sx={{ width: 80 }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={chipLabel} color={chipColor} size="small" sx={{ fontWeight: 500 }} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={handleClose} disabled={isPending || isApproving} color="inherit">
                    Hủy
                </Button>
                {preview ? <LoadingButton className="btn-primary-admin" loading={isApproving} onClick={handleApprove} label="Xác nhận lưu" variant="contained" /> : <LoadingButton className="btn-primary-admin" loading={isPending} onClick={handleSubmit} label="Tạo" variant="contained" />}
            </DialogActions>
        </Dialog>
    );
};
