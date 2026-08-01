import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { CollapsibleCard } from '../../../../components/ui/CollapsibleCard';
import { getSupplierStatusLabel, getSupplierTypeLabel } from '../../utils/supplierLabels';
import { formatViInteger } from '../../utils/supplierNumberFields';
import { formatSupplierTime } from '../../utils/supplierTimeFields';

interface SupplierInfoCardProps {
  supplier: any;
}

export const SupplierInfoCard: React.FC<SupplierInfoCardProps> = ({ supplier }) => {
  const statusLabel = getSupplierStatusLabel(supplier.isActive);
  const typeLabel = supplier.typeLabel || getSupplierTypeLabel(supplier.type);

  return (
    <CollapsibleCard title="Thông tin nhà cung cấp" expanded onToggle={() => undefined}>
      <Stack spacing={3} sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tên tổng đại lý
            </Typography>
            <Typography variant="body1" fontWeight={700}>
              {supplier.name}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Mã nhà cung cấp
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {supplier.code}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Loại nhà cung cấp
            </Typography>
            <Typography variant="body1">{typeLabel}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Trạng thái
            </Typography>
            <Box mt={0.5}>
              <Chip
                label={statusLabel}
                size="small"
                color={supplier.isActive ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Người liên hệ
            </Typography>
            <Typography variant="body1">{supplier.contactName || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Số điện thoại
            </Typography>
            <Typography variant="body1">{supplier.contactPhone}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{supplier.contactEmail || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Đơn giá nhập cố định
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {supplier.unitPrice != null ? `${formatViInteger(supplier.unitPrice)} đ/vé` : 'Chưa thiết lập'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Chiết khấu (%)
            </Typography>
            <Typography variant="body1">
              {supplier.commissionRate != null ? `${supplier.commissionRate}%` : 'Chưa thiết lập'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Địa chỉ
            </Typography>
            <Typography variant="body1">{supplier.address || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Ngày tạo
            </Typography>
            <Typography variant="body1">{formatSupplierTime(supplier.createdAt)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Cập nhật lần cuối
            </Typography>
            <Typography variant="body1">{formatSupplierTime(supplier.updatedAt)}</Typography>
          </Box>
        </Box>
      </Stack>
    </CollapsibleCard>
  );
};
