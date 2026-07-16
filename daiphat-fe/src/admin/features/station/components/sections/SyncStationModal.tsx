import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box
} from '@mui/material';
import { usePreviewSyncStations } from '../../hooks/useStation';
import { toast } from 'react-toastify';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import type { SyncPreviewParams } from './SyncStationPreviewModal';

interface SyncStationModalProps {
    open: boolean;
    onClose: () => void;
    onPreviewSuccess: (preview: any, params: SyncPreviewParams) => void;
}

export const SyncStationModal: React.FC<SyncStationModalProps> = ({
    open,
    onClose,
    onPreviewSuccess,
}) => {
    const { mutate: previewSync, isPending } = usePreviewSyncStations();
    const [source, setSource] = useState('MINH_NGOC');
    const [region, setRegion] = useState('MIEN_NAM');
    const [priceInput, setPriceInput] = useState('10,000');

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        if (!rawValue) {
            setPriceInput('');
            return;
        }
        setPriceInput(Number(rawValue).toLocaleString('en-US'));
    };

    const handleSubmit = () => {
        const defaultPrice = Number(priceInput.replace(/,/g, ''));
        if (!defaultPrice || defaultPrice <= 0) {
            toast.error('Vui lòng nhập giá vé bán mặc định hợp lệ.');
            return;
        }

        const params: SyncPreviewParams = { source, region, defaultPrice };

        previewSync(params, {
            onSuccess: (response: any) => {
                onPreviewSuccess(response, params);
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Xem trước đồng bộ thất bại');
            }
        });
    };

    return (
        <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Đồng bộ Nhà đài</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Nguồn dữ liệu</InputLabel>
                        <Select
                            value={source}
                            label="Nguồn dữ liệu"
                            onChange={(e) => setSource(e.target.value)}
                            disabled={isPending}
                        >
                            <MenuItem value="MINH_NGOC">Minh Ngọc</MenuItem>
                            <MenuItem value="XOSO_VN">Xoso.vn</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Miền</InputLabel>
                        <Select
                            value={region}
                            label="Miền"
                            onChange={(e) => setRegion(e.target.value)}
                            disabled={isPending}
                        >
                            <MenuItem value="MIEN_NAM">Miền Nam</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Giá vé bán mặc định"
                        type="text"
                        value={priceInput}
                        onChange={handlePriceChange}
                        disabled={isPending}
                    />
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
