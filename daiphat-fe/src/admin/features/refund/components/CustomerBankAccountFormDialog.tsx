"use client";

import { useEffect, useState } from 'react';
import {
    Autocomplete,
    Box,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Button } from '@/admin/components/ui/Button';
import { useGetBanks } from '@/client/hooks/useBankAccount';
import { useCreateRefundCustomerBankAccount } from '@/admin/features/refund/hooks/useRefundManagement';
import {
    BANK_ACCOUNT_NO_INVALID_MESSAGE,
    BANK_ACCOUNT_NO_MAX_LENGTH,
    sanitizeBankAccountNoInput,
    validateBankAccountNo,
} from '@/shared/bank-account/bankAccountNoValidation';
import type { UserBankAccountResponse, VietQrBankResponse } from '@/types/refund.type';

interface CustomerBankAccountFormDialogProps {
    open: boolean;
    refundId: number;
    customerId: string;
    defaultAccountName?: string | null;
    onClose: () => void;
    onCreated: (account: UserBankAccountResponse) => void;
}

const toBankAccountName = (value?: string | null) =>
    (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'D')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

export const CustomerBankAccountFormDialog = ({
    open,
    refundId,
    customerId,
    defaultAccountName,
    onClose,
    onCreated,
}: CustomerBankAccountFormDialogProps) => {
    const { data: banksData, isLoading: isLoadingBanks } = useGetBanks();
    const createMutation = useCreateRefundCustomerBankAccount();
    const banks = banksData?.data || [];

    const [selectedBank, setSelectedBank] = useState<VietQrBankResponse | null>(null);
    const [bankAccountNo, setBankAccountNo] = useState('');
    const [bankAccountNoError, setBankAccountNoError] = useState<string | null>(null);
    const [bankAccountName, setBankAccountName] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSelectedBank(null);
        setBankAccountNo('');
        setBankAccountNoError(null);
        setBankAccountName(toBankAccountName(defaultAccountName));
        setIsDefault(false);
        setConfirmed(false);
        // Reset only when the dialog opens.
    }, [open]);

    const busy = createMutation.isPending;
    const canSubmit =
        !!selectedBank && !!bankAccountNo.trim() && !!bankAccountName.trim() && confirmed && !busy;

    const handleClose = () => {
        if (busy) return;
        onClose();
    };

    const handleSubmit = () => {
        const accountNoError = validateBankAccountNo(bankAccountNo);
        setBankAccountNoError(accountNoError);
        if (accountNoError || !selectedBank || !bankAccountName.trim() || !confirmed) return;

        createMutation.mutate(
            {
                id: refundId,
                customerId,
                data: {
                    bankBin: selectedBank.bin,
                    bankAccountNo: bankAccountNo.trim(),
                    bankAccountName: bankAccountName.trim().toUpperCase(),
                    isDefault,
                    agreedToRefundTerms: true,
                },
            },
            {
                onSuccess: (response) => {
                    if (response.success && response.data) {
                        onCreated(response.data);
                        onClose();
                    }
                },
            }
        );
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ className: 'admin-theme' }}
        >
            <DialogTitle sx={{ pb: 1 }}>Tạo tài khoản ngân hàng cho khách hàng</DialogTitle>
            <DialogContent dividers sx={{ pt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Nhập thông tin tài khoản do khách hàng cung cấp trực tiếp tại quầy. Tài khoản sẽ được lưu vào
                    hồ sơ của khách hàng và dùng để nhận hoàn tiền.
                </Typography>
                <Stack spacing={2}>
                    <Autocomplete
                        options={banks}
                        loading={isLoadingBanks}
                        value={selectedBank}
                        onChange={(_, value) => setSelectedBank(value)}
                        getOptionLabel={(option) =>
                            option.shortName ? `${option.shortName} — ${option.name}` : option.name
                        }
                        isOptionEqualToValue={(a, b) => a.bin === b.bin}
                        renderOption={({ key, ...optionProps }, option) => (
                            <Box component="li" key={key} {...optionProps} sx={{ display: 'flex', gap: 1.5 }}>
                                {option.logo && (
                                    <Box
                                        component="img"
                                        src={option.logo}
                                        alt=""
                                        sx={{ width: 24, height: 24, objectFit: 'contain' }}
                                    />
                                )}
                                {option.shortName ? `${option.shortName} — ${option.name}` : option.name}
                            </Box>
                        )}
                        disabled={busy}
                        renderInput={(params) => <TextField {...params} label="Ngân hàng *" size="small" />}
                    />
                    <TextField
                        label="Số tài khoản *"
                        value={bankAccountNo}
                        onChange={(e) => {
                            setBankAccountNo(sanitizeBankAccountNoInput(e.target.value));
                            if (bankAccountNoError) setBankAccountNoError(null);
                        }}
                        onBlur={() => {
                            if (bankAccountNo.trim()) {
                                setBankAccountNoError(validateBankAccountNo(bankAccountNo));
                            }
                        }}
                        fullWidth
                        size="small"
                        disabled={busy}
                        error={!!bankAccountNoError}
                        inputProps={{
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                            maxLength: BANK_ACCOUNT_NO_MAX_LENGTH,
                        }}
                        helperText={bankAccountNoError || BANK_ACCOUNT_NO_INVALID_MESSAGE}
                    />
                    <TextField
                        label="Tên chủ tài khoản *"
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                        placeholder="NGUYEN VAN A"
                        fullWidth
                        size="small"
                        disabled={busy}
                        inputProps={{ maxLength: 150 }}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                disabled={busy}
                            />
                        }
                        label={<Typography variant="body2">Đặt làm tài khoản mặc định của khách hàng</Typography>}
                    />
                    <FormControlLabel
                        sx={{ alignItems: 'flex-start' }}
                        control={
                            <Checkbox
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                disabled={busy}
                                sx={{ pt: 0.25 }}
                            />
                        }
                        label={
                            <Typography variant="body2">
                                Khách hàng đã đối chiếu và xác nhận thông tin tài khoản ngân hàng trên là chính xác.
                            </Typography>
                        }
                    />
                </Stack>
            </DialogContent>
            <DialogActions
                sx={{ px: 3, pb: 3, pt: 1.5, gap: 1, borderTop: '1px solid var(--palette-divider)' }}
            >
                <Button
                    onClick={handleClose}
                    color="inherit"
                    variant="outlined"
                    className="btn-outlined-admin"
                    disabled={busy}
                    label="Hủy"
                    sx={{ minWidth: 96 }}
                />
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={!canSubmit}
                    loading={busy}
                    loadingLabel="Đang lưu..."
                    label="Tạo tài khoản"
                    sx={{ minWidth: 140, boxShadow: 'none !important' }}
                />
            </DialogActions>
        </Dialog>
    );
};
