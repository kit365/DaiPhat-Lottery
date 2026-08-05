"use client";

import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { Box, Card, Stack, Typography } from '@mui/material';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useReturnBatchList } from '../../hooks/useReturnBatch';
import { ReturnBatchList } from '../sections/ReturnBatchList';
import { ReturnBatchReminderBanner } from '../sections/ReturnBatchReminderBanner';

export const ReturnBatchListPage = () => {
    const listHook = useReturnBatchList();
    const { batches, pagination } = listHook;

    // Calculate metrics
    const totalCount = pagination?.totalRecords || batches.length || 0;
    const pendingCount = batches.filter((b: any) => b.status === 'PENDING_INSPECTION').length;
    const inspectingCount = batches.filter((b: any) => b.status === 'INSPECTING').length;
    const handedOverCount = batches.filter((b: any) => b.status === 'HANDED_OVER').length;
    const totalPageReturnValue = batches.reduce(
        (sum: number, item: any) => sum + Number(item.totalReturnValue || 0),
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
                            { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                            { label: 'Phiếu trả vé' },
                        ]}
                    />
                </div>
            </div>

            {/* In-App Reminder Banner for Inspection Window & Cutoff */}
            <ReturnBatchReminderBanner batches={batches} />

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
                {/* 1. Tổng phiếu trả vé */}
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
                                Tổng phiếu
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ mt: 0.25 }}>
                                {totalCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 2. Chờ kiểm tra vé */}
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
                                Chờ kiểm tra
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#d97706" sx={{ mt: 0.25 }}>
                                {pendingCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 3. Đang kiểm tra vé */}
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
                            <FactCheckOutlinedIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} color="#64748b" display="block">
                                Đang kiểm tra
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#0284c7" sx={{ mt: 0.25 }}>
                                {inspectingCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 4. Đã bàn giao NCC */}
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
                                Đã bàn giao NCC
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#16a34a" sx={{ mt: 0.25 }}>
                                {handedOverCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 5. Giá trị trả (trang này) */}
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
                                Trị giá vé trả
                            </Typography>
                            <Typography
                                variant="h6"
                                fontWeight={800}
                                color="#059669"
                                sx={{ mt: 0.25, fontSize: { lg: '1rem', xl: '1.1rem' }, lineHeight: 1.2 }}
                            >
                                {formatImportCost(totalPageReturnValue)} VNĐ
                            </Typography>
                        </Box>
                    </Stack>
                </Card>
            </Box>

            {/* List Table Section */}
            <ReturnBatchList listHook={listHook} />
        </Box>
    );
};
