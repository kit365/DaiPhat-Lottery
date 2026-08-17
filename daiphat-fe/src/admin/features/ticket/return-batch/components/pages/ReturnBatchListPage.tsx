"use client";

import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { Box } from '@mui/material';
import { AdminKpiCard, AdminKpiCardsGrid } from '@/admin/components/ui/AdminKpiCard';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { formatKpiAmount } from '@/admin/utils/currency';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useReturnBatchList } from '../../hooks/useReturnBatch';
import { ReturnBatchList } from '../sections/ReturnBatchList';
import { ReturnBatchReminderBanner } from '../sections/ReturnBatchReminderBanner';

export const ReturnBatchListPage = () => {
    const listHook = useReturnBatchList();
    const { batches, pagination } = listHook;

    // Calculate executive metrics
    const totalCount = pagination?.totalRecords || batches.length || 0;
    const pendingInspectionCount = batches.filter(
        (b) => b.status === 'PENDING_INSPECTION' || b.status === 'INSPECTING'
    ).length;
    const handedOverCount = batches.filter((b) => b.status === 'HANDED_OVER').length;
    const totalPageQuantity = batches.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
    const totalPageReturnValue = batches.reduce(
        (sum, item) => sum + (item.totalReturnValue || 0),
        0
    );

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            {/* Header */}
            <div className="mb-[calc(4*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))] flex-wrap">
                <div className="mr-auto">
                    <Title title="Danh sách phiếu trả vé" />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Phiếu trả vé', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                            { label: 'Danh sách' },
                        ]}
                    />
                </div>
            </div>

            {/* Reminder Banner (if any batch is urgent/in inspection window) */}
            <ReturnBatchReminderBanner batches={batches} />

            <AdminKpiCardsGrid columns={{ xs: 1, sm: 2, md: 3, xl: 5 }}>
                <AdminKpiCard
                    label="Tổng phiếu trả"
                    value={String(totalCount)}
                    icon={<AssignmentOutlinedIcon fontSize="small" />}
                    tone="blue"
                />
                <AdminKpiCard
                    label="Chờ kiểm tra vé"
                    value={String(pendingInspectionCount)}
                    icon={<HourglassEmptyOutlinedIcon fontSize="small" />}
                    tone="amber"
                />
                <AdminKpiCard
                    label="Đã bàn giao"
                    value={String(handedOverCount)}
                    icon={<CheckCircleOutlinedIcon fontSize="small" />}
                    tone="green"
                />
                <AdminKpiCard
                    label="Vé trả lại"
                    value={totalPageQuantity.toLocaleString('vi-VN')}
                    icon={<ConfirmationNumberOutlinedIcon fontSize="small" />}
                    tone="cyan"
                />
                <AdminKpiCard
                    label="Trị giá trả vé"
                    value={formatKpiAmount(totalPageReturnValue)}
                    valueTitle={`${formatImportCost(totalPageReturnValue)} VNĐ`}
                    icon={<PaymentsOutlinedIcon fontSize="small" />}
                    accent
                    valueSize="compact"
                />
            </AdminKpiCardsGrid>

            {/* List Table Section */}
            <ReturnBatchList listHook={listHook} />
        </Box>
    );
};
