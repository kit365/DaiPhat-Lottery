import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { CollapsibleCard } from '../../../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { CanAccess } from '../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { ROUTES } from '../../../../constants/routes';
import { useSupplierDetail } from '../../hooks/useSupplier';
import { getSupplierStatusLabel, getSupplierTypeLabel } from '../../utils/supplierLabels';
import { formatViInteger } from '../../utils/supplierNumberFields';
import { formatSupplierTime } from '../../utils/supplierTimeFields';

export const SupplierDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: supplier, isLoading, isError } = useSupplierDetail(id);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !supplier) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography color="text.secondary">Không tìm thấy nhà cung cấp.</Typography>
            </Box>
        );
    }

    const statusLabel = getSupplierStatusLabel(supplier.isActive);
    const typeLabel = supplier.typeLabel || getSupplierTypeLabel(supplier.type);

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))]">
                <div className="mr-auto">
                    <Title title="Chi tiết nhà cung cấp" />
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                            { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                            { label: supplier.name },
                        ]}
                    />
                </div>
                <CanAccess permission={PERMISSIONS.SUPPLIER.EDIT}>
                    <LoadingButton
                        label="Chỉnh sửa"
                        className="btn-primary-admin"
                        onClick={() => navigate(ROUTES.ADMIN.SUPPLIER.EDIT(supplier.id))}
                    />
                </CanAccess>
            </div>

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
                            <Typography variant="caption" color="text.secondary">Tên tổng đại lý</Typography>
                            <Typography variant="body1" fontWeight={700}>{supplier.name}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Mã nhà cung cấp</Typography>
                            <Typography variant="body1" fontWeight={600}>{supplier.code}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Loại nhà cung cấp</Typography>
                            <Typography variant="body1">{typeLabel}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
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
                            <Typography variant="caption" color="text.secondary">Người liên hệ</Typography>
                            <Typography variant="body1">{supplier.contactName || '—'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Số điện thoại</Typography>
                            <Typography variant="body1">{supplier.contactPhone}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Email</Typography>
                            <Typography variant="body1">{supplier.contactEmail || '—'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Mã số thuế</Typography>
                            <Typography variant="body1">{supplier.taxCode || '—'}</Typography>
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1' }}>
                            <Typography variant="caption" color="text.secondary">Địa chỉ</Typography>
                            <Typography variant="body1">{supplier.address || '—'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Số ngày thanh toán</Typography>
                            <Typography variant="body1">
                                {supplier.paymentTermDays ?? '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Giá vốn mặc định</Typography>
                            <Typography variant="body1">
                                {supplier.defaultImportCost != null
                                    ? `${formatViInteger(supplier.defaultImportCost)} VNĐ`
                                    : '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Giờ cho phép nhập vé</Typography>
                            <Typography variant="body1" fontWeight={600}>
                                {formatSupplierTime(supplier.importAllowFrom)}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Hạn trả vé</Typography>
                            <Typography variant="body1" fontWeight={600}>
                                {formatSupplierTime(supplier.returnCutOffTime)}
                            </Typography>
                        </Box>
                    </Box>
                </Stack>
            </CollapsibleCard>
        </Box>
    );
};
