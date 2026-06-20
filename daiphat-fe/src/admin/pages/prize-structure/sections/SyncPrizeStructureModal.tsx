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
    Box
} from '@mui/material';
import { useSyncPrizeStructure } from '../hooks/usePrizeStructure';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { PrizeStructureSyncResponse } from '../types/prize-structure';

interface SyncPrizeStructureModalProps {
    open: boolean;
    onClose: () => void;
}

export const SyncPrizeStructureModal: React.FC<SyncPrizeStructureModalProps> = ({ open, onClose }) => {
    const queryClient = useQueryClient();
    const { mutate: syncPrizeStructure, isPending } = useSyncPrizeStructure();
    
    const [source, setSource] = useState<'MINH_NGOC' | 'XOSO_VN'>('MINH_NGOC');
    const [region, setRegion] = useState('MIEN_NAM');

    const handleSubmit = () => {
        syncPrizeStructure(
            { source, region },
            {
                onSuccess: (res) => {
                    const data = (res?.data || res) as PrizeStructureSyncResponse;
                    const summary = data?.summary;
                    if (summary) {
                        toast.success(`Đồng bộ thành công! (Tạo: ${summary.createdCount}, Cập nhật: ${summary.updatedCount}, Xóa: ${summary.deletedCount})`);
                    } else {
                        toast.success('Đồng bộ cơ cấu giải thưởng thành công');
                    }
                    if (data?.warnings?.length > 0) {
                        toast.warning(`Có ${data.warnings.length} cảnh báo. Vui lòng kiểm tra lại.`);
                    }
                    queryClient.invalidateQueries({ queryKey: ['prize-structures', region] });
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Đồng bộ thất bại');
                }
            }
        );
    };

    return (
        <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Đồng bộ Cơ cấu giải thưởng</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Nguồn dữ liệu</InputLabel>
                        <Select
                            value={source}
                            label="Nguồn dữ liệu"
                            onChange={(e) => setSource(e.target.value as 'MINH_NGOC' | 'XOSO_VN')}
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
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} disabled={isPending} color="inherit">
                    Hủy
                </Button>
                <LoadingButton
                    loading={isPending}
                    onClick={handleSubmit}
                    label="Đồng bộ"
                    variant="contained"
                />
            </DialogActions>
        </Dialog>
    );
};
