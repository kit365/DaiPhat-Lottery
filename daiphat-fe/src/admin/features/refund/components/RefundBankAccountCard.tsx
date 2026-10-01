"use client";

import type { ReactNode } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { toast } from 'react-toastify';
import type { UserBankAccountResponse } from '@/types/refund.type';

async function copyToClipboard(value: string, successMessage: string) {
    try {
        await navigator.clipboard.writeText(value);
        toast.success(successMessage);
    } catch {
        toast.error('Không thể sao chép. Vui lòng thử lại.');
    }
}

export function RefundBankAccountCard({
    bankAccount,
    compact = false,
    subheader = 'Chỉ xem — dùng để đối chiếu khi chuyển khoản',
    emptyMessage = 'Chưa có thông tin tài khoản ngân hàng trên yêu cầu hoàn tiền.',
    action,
    children,
}: {
    bankAccount?: UserBankAccountResponse | null;
    compact?: boolean;
    subheader?: string;
    emptyMessage?: string;
    action?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                borderRadius: 2,
                bgcolor: 'action.hover',
            }}
        >
            <CardHeader
                title="Thông tin tài khoản nhận hoàn tiền"
                subheader={subheader}
                action={action}
                slotProps={{
                    title: { sx: { fontWeight: 700, fontSize: '1rem' } },
                    subheader: { sx: { fontSize: '0.75rem' } },
                }}
                sx={{ pb: 1, '& .MuiCardHeader-action': { alignSelf: 'center', m: 0 } }}
            />
            <Divider />
            <CardContent sx={{ pt: 2 }}>
                {children}
                {bankAccount ? (
                    <Stack spacing={compact ? 1.5 : 2}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            {bankAccount.bankLogo ? (
                                <Box
                                    component="img"
                                    src={bankAccount.bankLogo}
                                    alt={bankAccount.bankName}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        objectFit: 'contain',
                                        borderRadius: 1,
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        p: 0.5,
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 1,
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon icon="mdi:bank" width={22} />
                                </Box>
                            )}
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Ngân hàng
                                </Typography>
                                <Typography variant="body1" fontWeight={700} color="primary.main">
                                    {bankAccount.bankName || '—'}
                                </Typography>
                            </Box>
                        </Stack>

                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Số tài khoản
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                                <Typography
                                    component="span"
                                    sx={{
                                        fontFamily:
                                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                        fontSize: '1.25rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        color: 'text.primary',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {bankAccount.bankAccountNo || '—'}
                                </Typography>
                                {bankAccount.bankAccountNo ? (
                                    <Tooltip title="Sao chép số tài khoản">
                                        <IconButton
                                            size="small"
                                            aria-label="Sao chép số tài khoản"
                                            onClick={() =>
                                                copyToClipboard(
                                                    bankAccount.bankAccountNo,
                                                    'Đã sao chép số tài khoản'
                                                )
                                            }
                                            sx={{ color: 'primary.main' }}
                                        >
                                            <Icon icon="solar:copy-bold-duotone" width={18} />
                                        </IconButton>
                                    </Tooltip>
                                ) : null}
                            </Stack>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Chủ tài khoản
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                                <Typography
                                    variant="body1"
                                    fontWeight={700}
                                    sx={{ textTransform: 'uppercase' }}
                                >
                                    {bankAccount.bankAccountName || '—'}
                                </Typography>
                                {bankAccount.bankAccountName ? (
                                    <Tooltip title="Sao chép tên chủ tài khoản">
                                        <IconButton
                                            size="small"
                                            aria-label="Sao chép tên chủ tài khoản"
                                            onClick={() =>
                                                copyToClipboard(
                                                    bankAccount.bankAccountName,
                                                    'Đã sao chép tên chủ tài khoản'
                                                )
                                            }
                                            sx={{ color: 'primary.main' }}
                                        >
                                            <Icon icon="solar:copy-bold-duotone" width={18} />
                                        </IconButton>
                                    </Tooltip>
                                ) : null}
                            </Stack>
                        </Box>
                    </Stack>
                ) : (
                    <Typography variant="body2" color="warning.main">
                        {emptyMessage}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
