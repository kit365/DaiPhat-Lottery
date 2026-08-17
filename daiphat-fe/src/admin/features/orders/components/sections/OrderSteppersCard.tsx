import React from 'react';
import { Card, Grid, Box, Typography } from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import dayjs from 'dayjs';
import { OrderStatus } from '../../../../../types/order.type';

interface OrderSteppersCardProps {
  order: any;
}

export const OrderSteppersCard: React.FC<OrderSteppersCardProps> = ({ order }) => {
  if (order.orderType === 'DIRECT') return null;

  const isCancelled = order.status === OrderStatus.CANCELLED;
  const isPaymentComplaintPending = order.status === OrderStatus.PAYMENT_COMPLAINT_PENDING;
  const paymentTxn = (order.transactions || []).find(
    (tx: any) => tx?.status === 'COMPLETED' || tx?.status === 'REFUNDED'
  );
  const hasCompletedPayment = Boolean(paymentTxn);
  const paidStatuses = ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'];
  const wasPaid = isCancelled ? hasCompletedPayment : paidStatuses.includes(order.status);
  const paymentDateSource = paymentTxn?.paidAt || (order as any).updatedAt;
  const paymentDate = wasPaid ? dayjs(paymentDateSource).format('DD/MM/YYYY - HH:mm') : '';

  type MilestoneStep = {
    label: string;
    date: string;
    completed: boolean;
    variant: 'success' | 'error' | 'pending';
  };

  const cancelDate = order.cancelledAt
    ? dayjs(order.cancelledAt).format('DD/MM/YYYY - HH:mm')
    : dayjs((order as any).updatedAt).format('DD/MM/YYYY - HH:mm');

  let steps: MilestoneStep[];
  if (isPaymentComplaintPending) {
    steps = [
      {
        label: 'Đã đặt đơn',
        date: dayjs(order.createdAt).format('DD/MM/YYYY - HH:mm'),
        completed: true,
        variant: 'success',
      },
      {
        label: 'Chờ xác minh thanh toán',
        date: dayjs((order as any).updatedAt).format('DD/MM/YYYY - HH:mm'),
        completed: false,
        variant: 'pending',
      },
    ];
  } else if (isCancelled && !wasPaid) {
    steps = [
      {
        label: 'Đã đặt đơn',
        date: dayjs(order.createdAt).format('DD/MM/YYYY - HH:mm'),
        completed: true,
        variant: 'success',
      },
      {
        label: 'Đã huỷ',
        date: cancelDate,
        completed: true,
        variant: 'error',
      },
    ];
  } else if (isCancelled && wasPaid) {
    steps = [
      {
        label: 'Đã đặt đơn',
        date: dayjs(order.createdAt).format('DD/MM/YYYY - HH:mm'),
        completed: true,
        variant: 'success',
      },
      {
        label: 'Đã thanh toán',
        date: paymentDate,
        completed: true,
        variant: 'success',
      },
      {
        label: 'Đã huỷ',
        date: cancelDate,
        completed: true,
        variant: 'error',
      },
    ];
  } else {
    steps = [
      {
        label: 'Đã đặt đơn',
        date: dayjs(order.createdAt).format('DD/MM/YYYY - HH:mm'),
        completed: true,
        variant: 'success',
      },
      {
        label: 'Đã thanh toán',
        date: paymentDate,
        completed: ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status),
        variant: 'success',
      },
      {
        label: 'Đang chuẩn bị',
        date: ['PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status)
          ? dayjs((order as any).updatedAt).format('DD/MM/YYYY - HH:mm')
          : '',
        completed: ['PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status),
        variant: 'success',
      },
      {
        label: 'Chờ giữ/giao',
        date: ['PENDING_PICKUP', 'COMPLETED'].includes(order.status)
          ? dayjs((order as any).updatedAt).format('DD/MM/YYYY - HH:mm')
          : '',
        completed: ['PENDING_PICKUP', 'COMPLETED'].includes(order.status),
        variant: 'success',
      },
      {
        label: 'Hoàn thành',
        date: order.status === OrderStatus.COMPLETED
          ? dayjs((order as any).updatedAt).format('DD/MM/YYYY - HH:mm')
          : '',
        completed: order.status === OrderStatus.COMPLETED,
        variant: 'success',
      },
    ];
  }

  return (
    <Card
      sx={{
        p: 3,
        mb: 3,
        borderRadius: '16px',
        boxShadow: 'var(--customShadows-card)',
        backgroundColor: 'var(--palette-background-paper)',
      }}
    >
      <Grid container spacing={2}>
        {steps.map((step, idx) => {
          const isErrorStep = step.variant === 'error';
          const isPendingStep = step.variant === 'pending';
          const iconBg = isErrorStep
            ? 'var(--palette-error-lighter)'
            : isPendingStep
              ? 'var(--palette-warning-lighter)'
            : step.completed
              ? 'var(--palette-success-lighter)'
              : 'var(--palette-background-neutral)';
          const iconColor = isErrorStep
            ? 'var(--palette-error-main)'
            : isPendingStep
              ? 'var(--palette-warning-dark)'
            : step.completed
              ? 'var(--palette-success-main)'
              : 'var(--palette-text-disabled)';
          const iconName = isErrorStep
            ? 'eva:close-circle-fill'
            : isPendingStep
              ? 'eva:clock-outline'
            : step.completed
              ? 'eva:checkmark-circle-2-fill'
              : 'eva:radio-button-off-outline';

          return (
            <Grid size={{ xs: 12, sm: 6, md: 12 / steps.length }} key={idx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: iconBg,
                    color: iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon icon={iconName} width={22} />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: isErrorStep
                        ? 'var(--palette-error-main)'
                        : isPendingStep
                          ? 'var(--palette-warning-dark)'
                        : step.completed
                          ? 'var(--palette-text-primary)'
                          : 'var(--palette-text-disabled)',
                      fontWeight: 700,
                    }}
                  >
                    {step.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)' }}>
                    {step.date || '—'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Card>
  );
};
