import { useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import { UserBankAccountResponse, maskBankAccountNo } from '../../../../types/refund.type';

interface AttachBankAccountDialogProps {
    open: boolean;
    loading?: boolean;
    accounts: UserBankAccountResponse[];
    onClose: () => void;
    onConfirm: (bankAccountId: number) => void;
}

export const AttachBankAccountDialog = ({
    open,
    loading,
    accounts,
    onClose,
    onConfirm,
}: AttachBankAccountDialogProps) => {
    const [bankAccountId, setBankAccountId] = useState<number | ''>('');

    const handleClose = () => {
        setBankAccountId('');
        onClose();
    };

    const handleConfirm = () => {
        if (bankAccountId === '') return;
        onConfirm(bankAccountId);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Gắn tài khoản nhận hoàn tiền</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Chọn tài khoản ngân hàng đã lưu của khách hàng. Sau khi gắn, yêu cầu chuyển sang
                    chờ chuyển khoản.
                </Typography>
                {accounts.length === 0 ? (
                    <Typography color="warning.main">
                        Khách hàng chưa có tài khoản ngân hàng. Vui lòng yêu cầu khách thêm STK trên
                        trang cá nhân.
                    </Typography>
                ) : (
                    <FormControl fullWidth>
                        <InputLabel id="attach-bank-label">Tài khoản ngân hàng</InputLabel>
                        <Select
                            labelId="attach-bank-label"
                            label="Tài khoản ngân hàng"
                            value={bankAccountId}
                            onChange={(e) => setBankAccountId(Number(e.target.value))}
                        >
                            {accounts.map((account) => (
                                <MenuItem key={account.id} value={account.id}>
                                    {account.bankName} — {maskBankAccountNo(account.bankAccountNo)} (
                                    {account.bankAccountName})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Hủy
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={loading || bankAccountId === '' || accounts.length === 0}
                >
                    Xác nhận
                </Button>
            </DialogActions>
        </Dialog>
    );
};
