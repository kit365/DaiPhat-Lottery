import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useParams } from '@/components/router-compat';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useSupplierSettlementDetail } from '../../hooks/useSupplierSettlement';
import {
    getSupplierSettlementStatusLabel,
    getSupplierSettlementStatusModifier,
} from '../../utils/settlementLabels';

const MoneyField = ({ label, value }: { label: string; value?: number | null }) => (
    <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body1" fontWeight={600}>
            {formatImportCost(value)} VNĐ
        </Typography>
    </Box>
);

export const SupplierSettlementDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const { data: settlement, isLoading, isError } = useSupplierSettlementDetail(id);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !settlement) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography color="text.secondary">Không tìm thấy kỳ đối soát.</Typography>
            </Box>
        );
    }

    const statusLabel = getSupplierSettlementStatusLabel(settlement.status, settlement.statusLabel);
    const periodFrom = settlement.periodFrom
        ? dayjs(settlement.periodFrom).format('DD/MM/YYYY')
        : '—';
    const periodTo = settlement.periodTo
        ? dayjs(settlement.periodTo).format('DD/MM/YYYY')
        : '—';

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))]">
                <div className="mr-auto">
                    <Title title="Chi tiết đối soát nhà cung cấp" />
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                            { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
                            { label: settlement.supplierName || `#${settlement.id}` },
                        ]}
                    />
                </div>
            </div>

            <CollapsibleCard title="Thông tin kỳ đối soát" expanded onToggle={() => undefined}>
                <Stack spacing={3} sx={{ p: 3 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                            gap: 3,
                        }}
                    >
                        <Box>
                            <Typography variant="caption" color="text.secondary">Nhà cung cấp</Typography>
                            <Typography variant="body1" fontWeight={700}>
                                {settlement.supplierName || '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Mã nhà cung cấp</Typography>
                            <Typography variant="body1" fontWeight={600}>
                                {settlement.supplierCode || '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Kỳ đối soát</Typography>
                            <Typography variant="body1">
                                {periodFrom} → {periodTo}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                            <Box mt={0.5}>
                                <span
                                    className={`admin-status-badge ${getSupplierSettlementStatusModifier(settlement.status)}`}
                                >
                                    {statusLabel}
                                </span>
                            </Box>
                        </Box>
                        <MoneyField label="Tổng giá trị nhập" value={settlement.totalImportValue} />
                        <MoneyField label="Tổng giá trị trả" value={settlement.totalReturnValue} />
                        <MoneyField label="Đã thanh toán" value={settlement.totalPaidAmount} />
                        <MoneyField label="Còn lại" value={settlement.remainingAmount} />
                        <Box>
                            <Typography variant="caption" color="text.secondary">Mã giao dịch sổ cái</Typography>
                            <Typography variant="body1">
                                {settlement.transactionId ?? '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Cập nhật lần cuối</Typography>
                            <Typography variant="body1">
                                {settlement.updatedAt
                                    ? dayjs(settlement.updatedAt).format('DD/MM/YYYY HH:mm')
                                    : '—'}
                            </Typography>
                        </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        Thanh toán / trả vé sẽ được bổ sung ở giai đoạn sau. Hiện tại hệ thống chỉ theo dõi tổng giá trị nhập từ các phiếu nhập lô đã liên kết.
                    </Typography>
                </Stack>
            </CollapsibleCard>
        </Box>
    );
};
