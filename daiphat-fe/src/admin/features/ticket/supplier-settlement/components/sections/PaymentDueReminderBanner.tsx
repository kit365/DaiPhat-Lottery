"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useEffect, useMemo, useState } from 'react';
import AccessAlarmOutlinedIcon from '@mui/icons-material/AccessAlarmOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useSettlementPaymentReminderConfig } from '../../hooks/useSettlementPaymentReminderConfig';
import { SupplierSettlement } from '../../types/supplierSettlement.type';

interface PaymentDueReminderBannerProps {
    settlements: SupplierSettlement[];
}

type DueSoonItem = SupplierSettlement & {
    minutesLeft: number;
    paymentCutOffLabel: string;
};

const formatDate = (dStr?: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
};

const normalizeTime = (raw?: string | null) => {
    if (!raw) return null;
    const match = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) {
        return null;
    }
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const PaymentDueReminderBanner = ({ settlements }: PaymentDueReminderBannerProps) => {
    const router = useAdminRouter();
    const { reminderMinutes } = useSettlementPaymentReminderConfig();
    const [openModal, setOpenModal] = useState(false);
    const [nowTick, setNowTick] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNowTick(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    const dueSoonItems = useMemo(() => {
        const now = dayjs(nowTick);
        const today = now.format('YYYY-MM-DD');

        return (settlements || [])
            .filter((item) => {
                if (!item || item.status === 'COMPLETED' || item.paidAt) {
                    return false;
                }
                return item.periodFrom === today;
            })
            .map((item) => {
                const paymentCutOffLabel = normalizeTime(item.paymentCutOffTime);
                if (!paymentCutOffLabel) {
                    return null;
                }
                const [hStr, mStr] = paymentCutOffLabel.split(':');
                const cutOff = dayjs(item.periodFrom)
                    .hour(Number(hStr) || 0)
                    .minute(Number(mStr) || 0)
                    .second(0)
                    .millisecond(0);
                const reminderStart = cutOff.subtract(reminderMinutes, 'minute');
                if (now.isBefore(reminderStart) || !now.isBefore(cutOff)) {
                    return null;
                }
                return {
                    ...item,
                    paymentCutOffLabel,
                    minutesLeft: Math.max(0, Math.ceil(cutOff.diff(now, 'minute', true))),
                } satisfies DueSoonItem;
            })
            .filter((item): item is DueSoonItem => item != null)
            .sort((a, b) => a.minutesLeft - b.minutesLeft);
    }, [settlements, reminderMinutes, nowTick]);

    if (dueSoonItems.length <= 0) {
        return null;
    }

    const handleActionClick = () => {
        if (dueSoonItems.length === 1) {
            router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(dueSoonItems[0].id));
            return;
        }
        setOpenModal(true);
    };

    const soonest = dueSoonItems[0];

    return (
        <>
            <Alert
                severity="warning"
                icon={<AccessAlarmOutlinedIcon fontSize="inherit" />}
                sx={{ py: 0.75, alignItems: 'center' }}
                action={
                    <Button
                        color="inherit"
                        size="small"
                        onClick={handleActionClick}
                        sx={{ fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        Xem chi tiết
                    </Button>
                }
            >
                <Typography variant="body2" component="span">
                    Còn dưới <strong>{soonest.minutesLeft} phút</strong> trước giờ thanh toán NCC gần nhất (
                    <strong>{soonest.paymentCutOffLabel}</strong>). Có <strong>{dueSoonItems.length}</strong> kỳ
                    đối soát chưa hoàn tất thanh toán — hãy xử lý trước hạn chót của từng nhà cung cấp.
                </Typography>
            </Alert>

            <Dialog
                open={openModal}
                onClose={() => setOpenModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2.5,
                        bgcolor: '#ffffff',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#fffbeb',
                                color: '#d97706',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #fde68a',
                                flexShrink: 0,
                            }}
                        >
                            <AccessAlarmOutlinedIcon sx={{ fontSize: '1.6rem' }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={800} color="#0f172a" lineHeight={1.2}>
                                Kỳ đối soát sắp đến hạn thanh toán
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                Nhắc trong {reminderMinutes} phút cuối trước giờ thanh toán của từng nhà cung cấp.
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton
                        onClick={() => setOpenModal(false)}
                        sx={{
                            color: '#64748b',
                            bgcolor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3, bgcolor: '#fafafa' }}>
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            bgcolor: '#ffffff',
                        }}
                    >
                        <Table size="medium">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>
                                        Nhà cung cấp
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>
                                        Kỳ đối soát
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>
                                        Giờ thanh toán
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>
                                        Còn phải trả
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>
                                        Thao tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dueSoonItems.map((item) => {
                                    const periodStr = `${formatDate(item.periodFrom)} → ${formatDate(item.periodTo)}`;
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={800}>
                                                    {item.supplierName || 'Nhà cung cấp'}
                                                </Typography>
                                                {item.supplierSettlementCode && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.supplierSettlementCode}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={periodStr}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700}>
                                                    {item.paymentCutOffLabel}
                                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                                                        (còn {item.minutesLeft}p)
                                                    </Typography>
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={800} color="#b45309">
                                                    {formatImportCost(item.remainingAmount)} VNĐ
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                                                    onClick={() => {
                                                        setOpenModal(false);
                                                        router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(item.id));
                                                    }}
                                                    sx={{
                                                        bgcolor: '#d97706',
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        '&:hover': { bgcolor: '#b45309' },
                                                    }}
                                                >
                                                    Chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>
        </>
    );
};
