"use client";

import AddIcon from '@mui/icons-material/Add';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { Box, Stack, Tab, Tabs, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { AdminKpiCard, AdminKpiCardsGrid } from '@/admin/components/ui/AdminKpiCard';
import { useTodayImportIntakeSummary } from '../../hooks/useImportBatchIntakeGate';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { Button as LoadingButton } from '../../../../../components/ui/Button';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { formatKpiAmount } from '@/admin/utils/currency';
import { formatImportCost } from '../../utils/importCostCalculator';
import { useImportBatchList } from '../../hooks/useImportBatch';
import { ImportBatchFileImportDialog } from '../sections/ImportBatchFileImportDialog';
import { ImportBatchFileJobList } from '../sections/ImportBatchFileJobList';
import { ImportBatchList } from '../sections/ImportBatchList';
import { IncompleteImportBatchNotification } from '../sections/IncompleteImportBatchNotification';
import { MissingStationImportBatchNotification } from '../sections/MissingStationImportBatchNotification';
import { ImportBatchIntakeStatusBanner } from '../sections/ImportBatchIntakeStatusBanner';

export const ImportBatchListPage = () => {
    const router = useAdminRouter();
    const listHook = useImportBatchList();
    const { batches, pagination } = listHook;
    const [fileImportOpen, setFileImportOpen] = useState(false);
    const [tab, setTab] = useState<'BATCHES' | 'FILE_JOBS'>('BATCHES');
    const todayIntake = useTodayImportIntakeSummary();
    const todayBlocked = todayIntake.anyBlockedForToday;
    const todayIntakeBlockedTooltip = useMemo(() => {
        if (!todayBlocked) {
            return '';
        }
        const earliestBlockTime =
            todayIntake.blockedSuppliers
                .map((supplier) => supplier.inspectionStartLabel)
                .filter(Boolean)
                .sort()[0] ?? '—';
        const todayLabel = dayjs(todayIntake.today).format('DD/MM/YYYY');
        return `Từ ${earliestBlockTime} không nhập được cho kỳ quay ${todayLabel}. Chỉ thao tác phiếu ngày mai.`;
    }, [todayBlocked, todayIntake.blockedSuppliers, todayIntake.today]);

    // Calculate metrics
    const totalCount = pagination?.totalRecords || batches.length || 0;
    const inProgressCount = batches.filter(
        (b) => b.status === 'RECEIVING' || b.status === 'PARTIALLY_IMPORTED' || b.status === 'DRAFT'
    ).length;
    const completedCount = batches.filter(
        (b) => b.status === 'IMPORTED' || b.status === 'IN_LEDGER'
    ).length;
    const totalPageDeclaredQty = batches.reduce(
        (sum, item) =>
            sum +
            (item.totalDeclareQuantity ??
                (item.lines || []).reduce((ls, l) => ls + (l.declareQuantity || 0), 0)),
        0
    );
    const totalPageDeclaredCost = batches.reduce(
        (sum, item) =>
            sum +
            (item.totalDeclaredCostValue ??
                (item.lines || []).reduce(
                    (ls, l) => ls + (l.declaredCostValue || l.totalCostValue || 0),
                    0
                )),
        0
    );

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            {/* Header */}
            <div className="mb-[calc(4*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))] flex-wrap">
                <div className="mr-auto">
                    <Title title="Danh sách phiếu nhập lô" />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                            { label: 'Danh sách' },
                        ]}
                    />
                </div>
                <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                    <Tooltip title={todayIntakeBlockedTooltip}>
                        <span>
                            <LoadingButton
                                onClick={() => setFileImportOpen(true)}
                                label="Nhập từ tệp"
                                startIcon={<UploadFileOutlinedIcon />}
                                variant="outlined"
                                sx={{
                                    minHeight: '2.25rem',
                                    padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                                }}
                            />
                        </span>
                    </Tooltip>
                    <Tooltip title={todayIntakeBlockedTooltip}>
                        <span>
                            <LoadingButton
                                onClick={() => router.push(ROUTES.ADMIN.IMPORT_BATCH.CREATE)}
                                label="Khai báo phiếu nhập"
                                startIcon={<AddIcon />}
                                className="btn-primary-admin"
                                sx={{
                                    minHeight: '2.25rem',
                                    padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                                }}
                            />
                        </span>
                    </Tooltip>
                </CanAccess>
            </div>

            <ImportBatchIntakeStatusBanner />

            {/* Incomplete / Missing Station Notifications */}
            <Stack spacing={2} sx={{ mb: 2.5 }}>
                <CanAccess anyOf={[PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.TICKET.CREATE]}>
                    <IncompleteImportBatchNotification />
                    <MissingStationImportBatchNotification pageBatches={listHook.batches} />
                </CanAccess>
            </Stack>

            <Tabs
                value={tab}
                onChange={(_, next) => setTab(next)}
                sx={{ mb: 2.5, borderBottom: '1px solid #e2e8f0' }}
            >
                <Tab value="BATCHES" label="Danh sách phiếu nhập" />
                <Tab value="FILE_JOBS" label="Lịch sử nhập từ tệp" />
            </Tabs>

            {tab === 'BATCHES' && (
                <>
            {/* Metric KPI Cards */}
            <AdminKpiCardsGrid columns={{ xs: 1, sm: 2, md: 3, xl: 5 }}>
                <AdminKpiCard
                    label="Tổng phiếu nhập"
                    value={String(totalCount)}
                    icon={<AssignmentOutlinedIcon fontSize="small" />}
                    tone="blue"
                />
                <AdminKpiCard
                    label="Đang nhập vé"
                    value={String(inProgressCount)}
                    icon={<HourglassEmptyOutlinedIcon fontSize="small" />}
                    tone="amber"
                />
                <AdminKpiCard
                    label="Đã nhập xong"
                    value={String(completedCount)}
                    icon={<CheckCircleOutlinedIcon fontSize="small" />}
                    tone="green"
                />
                <AdminKpiCard
                    label="Vé khai báo"
                    value={totalPageDeclaredQty.toLocaleString('vi-VN')}
                    icon={<ConfirmationNumberOutlinedIcon fontSize="small" />}
                    tone="cyan"
                />
                <AdminKpiCard
                    label="Trị giá nhập vé"
                    value={formatKpiAmount(totalPageDeclaredCost)}
                    valueTitle={`${formatImportCost(totalPageDeclaredCost)} VNĐ`}
                    icon={<PaymentsOutlinedIcon fontSize="small" />}
                    accent
                    valueSize="compact"
                />
            </AdminKpiCardsGrid>

            {/* List Table Section */}
            <ImportBatchList listHook={listHook} />
                </>
            )}

            {tab === 'FILE_JOBS' && <ImportBatchFileJobList />}

            <ImportBatchFileImportDialog
                open={fileImportOpen}
                onClose={() => setFileImportOpen(false)}
                onImported={() => listHook.refetch()}
            />
        </Box>
    );
};
