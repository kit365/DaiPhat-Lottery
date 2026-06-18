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
import { useSyncProviders } from '../hooks/useProvider';
import { toast } from 'react-toastify';
import { LoadingButton } from '../../../components/ui/LoadingButton';

interface SyncProviderModalProps {
    open: boolean;
    onClose: () => void;
}

export const SyncProviderModal: React.FC<SyncProviderModalProps> = ({ open, onClose }) => {
    const { mutate: syncProviders, isPending } = useSyncProviders();
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
        syncProviders(
            { source, region, defaultPrice },
            {
                onSuccess: () => {
                    toast.success('Đồng bộ nhà đài thành công');
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
                            {/*
                            <MenuItem value="MIEN_TRUNG">Miền Trung</MenuItem>
                            <MenuItem value="MIEN_BAC">Miền Bắc</MenuItem>
                            */}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Giá vé mặc định"
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
