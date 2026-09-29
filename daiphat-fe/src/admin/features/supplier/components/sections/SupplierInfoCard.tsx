import dayjs from 'dayjs';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { CollapsibleCard } from '../../../../components/ui/CollapsibleCard';
import type { LotterySupplier } from '../../types/supplier.type';
import { getSupplierStatusLabel, getSupplierTypeLabel } from '../../utils/supplierLabels';
import { formatViInteger } from '../../utils/supplierNumberFields';
import { formatSupplierTime } from '../../utils/supplierTimeFields';

interface SupplierInfoCardProps {
    supplier: LotterySupplier;
}

const EMPTY_VALUE = '—';

const formatDateTime = (value?: string | null) => {
    if (!value) return EMPTY_VALUE;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
};

const formatMoney = (value?: number | null) => {
    if (value == null || !Number.isFinite(Number(value))) return 'Chưa thiết lập';
    return `${formatViInteger(Number(value))} đ/vé`;
};

const InfoItem = ({ label, children }: { label: string; children: ReactNode }) => (
    <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4 }}>
            {label}
        </Typography>
        <Typography variant="body1" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
            {children}
        </Typography>
    </Box>
);

export const SupplierInfoCard = ({ supplier }: SupplierInfoCardProps) => {
    const statusLabel = getSupplierStatusLabel(Boolean(supplier.isActive));
    const typeLabel = supplier.typeLabel || getSupplierTypeLabel(supplier.type);

    return (
        <CollapsibleCard
            title="Thông tin nhà cung cấp"
            expanded
            collapsible={false}
            onToggle={() => undefined}
        >
            <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                        gap: { xs: 2, md: 2.5 },
                    }}
                >
                    <InfoItem label="Tên nhà cung cấp">{supplier.name || EMPTY_VALUE}</InfoItem>
                    <InfoItem label="Mã nhà cung cấp">{supplier.code || EMPTY_VALUE}</InfoItem>
                    <InfoItem label="Loại nhà cung cấp">{typeLabel}</InfoItem>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.6 }}>
                            Trạng thái
                        </Typography>
                        <Chip
                            label={statusLabel}
                            size="small"
                            color={supplier.isActive ? 'success' : 'default'}
                            variant="outlined"
                        />
                    </Box>
                    <InfoItem label="Người liên hệ">{supplier.contactName || EMPTY_VALUE}</InfoItem>
                    <InfoItem label="Số điện thoại">{supplier.contactPhone || EMPTY_VALUE}</InfoItem>
                    <InfoItem label="Email">{supplier.contactEmail || EMPTY_VALUE}</InfoItem>
                    <InfoItem label="Mã số thuế">{supplier.taxCode || EMPTY_VALUE}</InfoItem>
                    <InfoItem label="Địa chỉ">{supplier.address || EMPTY_VALUE}</InfoItem>
                    <InfoItem label="Giá nhập mặc định">{formatMoney(supplier.defaultImportCost)}</InfoItem>
                    <InfoItem label="Thời hạn thanh toán">
                        {supplier.paymentTermDays != null
                            ? `${supplier.paymentTermDays.toLocaleString('vi-VN')} ngày`
                            : 'Chưa thiết lập'}
                    </InfoItem>
                    <InfoItem label="Bắt đầu nhận vé">{formatSupplierTime(supplier.importAllowFrom)}</InfoItem>
                    <InfoItem label="Hạn trả vé">{formatSupplierTime(supplier.returnCutOffTime)}</InfoItem>
                    <InfoItem label="Hạn thanh toán">{formatSupplierTime(supplier.paymentCutOffTime)}</InfoItem>
                    <InfoItem label="Ngày tạo">{formatDateTime(supplier.createdAt)}</InfoItem>
                    <InfoItem label="Cập nhật lần cuối">{formatDateTime(supplier.updatedAt)}</InfoItem>
                </Box>
            </Stack>
        </CollapsibleCard>
    );
};
