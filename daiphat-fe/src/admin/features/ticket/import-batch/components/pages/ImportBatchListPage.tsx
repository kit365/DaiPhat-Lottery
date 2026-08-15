"use client";

import AddIcon from '@mui/icons-material/Add';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { Box, Card, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useState } from 'react';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { Button as LoadingButton } from '../../../../../components/ui/Button';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../utils/importCostCalculator';
import { useImportBatchList } from '../../hooks/useImportBatch';
import { ImportBatchFileImportDialog } from '../sections/ImportBatchFileImportDialog';
import { ImportBatchFileJobList } from '../sections/ImportBatchFileJobList';
import { ImportBatchList } from '../sections/ImportBatchList';
import { IncompleteImportBatchNotification } from '../sections/IncompleteImportBatchNotification';
import { MissingStationImportBatchNotification } from '../sections/MissingStationImportBatchNotification';

export const ImportBatchListPage = () => {
    const router = useAdminRouter();
    const listHook = useImportBatchList();
    const { batches, pagination } = listHook;
    const [fileImportOpen, setFileImportOpen] = useState(false);
    const [tab, setTab] = useState<'BATCHES' | 'FILE_JOBS'>('BATCHES');

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
                </CanAccess>
            </div>

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
            {/* Metric KPI Cards - 5 Balanced Executive Cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(5, 1fr)',
                    },
                    gap: 2,
                    mb: 3,
                    width: '100%',
                }}
            >
                {/* 1. Tổng phiếu nhập */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2.25,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.75}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <AssignmentOutlinedIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} color="#64748b" display="block">
                                Tổng phiếu nhập
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ mt: 0.25 }}>
                                {totalCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 2. Đang tiếp nhận / Đang nhập */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2.25,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.75}>
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
                                flexShrink: 0,
                            }}
                        >
                            <HourglassEmptyOutlinedIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} color="#64748b" display="block">
                                Đang nhập vé
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#d97706" sx={{ mt: 0.25 }}>
                                {inProgressCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 3. Đã hoàn tất nhập */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2.25,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.75}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#f0fdf4',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <CheckCircleOutlinedIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} color="#64748b" display="block">
                                Đã nhập xong
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#16a34a" sx={{ mt: 0.25 }}>
                                {completedCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 4. Tổng vé khai báo */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2.25,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.75}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#f0f9ff',
                                color: '#0284c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <ConfirmationNumberOutlinedIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} color="#64748b" display="block">
                                Vé khai báo (trang)
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#0284c7" sx={{ mt: 0.25 }}>
                                {totalPageDeclaredQty.toLocaleString('vi-VN')}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 5. Trị giá nhập vé */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2.25,
                        borderRadius: '16px',
                        border: '1px solid #bbf7d0',
                        bgcolor: '#f0fdf4',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.75}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#dcfce7',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <PaymentsOutlinedIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="caption" fontWeight={700} color="#166534" display="block">
                                Trị giá nhập vé
                            </Typography>
                            <Typography
                                variant="h6"
                                fontWeight={800}
                                color="#059669"
                                sx={{ mt: 0.25, fontSize: { lg: '1rem', xl: '1.1rem' }, lineHeight: 1.2 }}
                            >
                                {formatImportCost(totalPageDeclaredCost)} VNĐ
                            </Typography>
                        </Box>
                    </Stack>
                </Card>
            </Box>

            {/* List Table Section */}
            <ImportBatchList listHook={listHook} />
                </>
            )}

            {tab === 'FILE_JOBS' && (
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        p: 1,
                    }}
                >
                    <ImportBatchFileJobList />
                </Card>
            )}

            <ImportBatchFileImportDialog
                open={fileImportOpen}
                onClose={() => setFileImportOpen(false)}
                onImported={() => listHook.refetch()}
            />
        </Box>
    );
};
