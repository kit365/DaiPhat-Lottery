"use client";

import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { Box, Card, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useReturnBatches } from '../../hooks/useReturnBatch';
import type { ReturnBatchListParams, ReturnBatchStatus } from '../../types/returnBatch.type';
import { returnBatchColumnsConfig } from '../configs/column.config';
import { DataGrid } from '@mui/x-data-grid';

export const ReturnBatchListPage = () => {
    const [params, setParams] = useState<ReturnBatchListParams>({
        page: 1,
        size: 10,
        sortBy: 'id',
        direction: 'DESC',
    });

    const { data, isLoading } = useReturnBatches(params);

    const rows = (data as any)?.recordList || (data as any)?.content || [];
    const totalElements = (data as any)?.pagination?.totalRecords || (data as any)?.totalElements || 0;

    // Metric counts calculation
    const totalCount = totalElements;
    const pendingCount = (data as any)?.pendingInspectionCount ?? 0;
    const inspectingCount = (data as any)?.inspectingCount ?? 0;
    const handedOverCount = (data as any)?.handedOverCount ?? 0;
    const cancelledCount = (data as any)?.cancelledCount ?? 0;
    const totalPageReturnValue = rows.reduce(
        (sum: number, item: any) => sum + Number(item.totalReturnValue || 0),
        0
    );

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            {/* Header */}
            <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))] flex-wrap">
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

            {/* Metric KPI Cards - 6 Status Cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: 'repeat(1, 1fr)',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(6, 1fr)',
                    },
                    gap: 2,
                    mb: 3,
                }}
            >
                {/* 1. Tổng phiếu trả vé */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                        height: '100%',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
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
                            <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap display="block">
                                Tổng phiếu
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#1e293b">
                                {totalCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 2. Chờ kiểm tra vé */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                        height: '100%',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
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
                            <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap display="block">
                                Chờ kiểm tra
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#d97706">
                                {pendingCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 3. Đang kiểm tra vé */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                        height: '100%',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
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
                            <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap display="block">
                                Đang kiểm tra
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#0284c7">
                                {inspectingCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 4. Đã bàn giao NCC */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                        height: '100%',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
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
                            <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap display="block">
                                Đã bàn giao NCC
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#16a34a">
                                {handedOverCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 5. Đã hủy */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                        height: '100%',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '12px',
                                bgcolor: '#fef2f2',
                                color: '#dc2626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <CancelOutlinedIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap display="block">
                                Đã hủy
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#dc2626">
                                {cancelledCount}
                            </Typography>
                        </Box>
                    </Stack>
                </Card>

                {/* 6. Tổng giá trị trả (trang) */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                        height: '100%',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '12px',
                                bgcolor: '#ecfdf5',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <PaymentsOutlinedIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap display="block">
                                Giá trị trả (trang)
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="#059669" noWrap>
                                {formatImportCost(totalPageReturnValue)} VNĐ
                            </Typography>
                        </Box>
                    </Stack>
                </Card>
            </Box>

            {/* Table Section */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#fff',
                    p: 2,
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                }}
            >
                <DataGrid
                    rows={rows}
                    columns={returnBatchColumnsConfig}
                    loading={isLoading}
                    rowCount={totalElements}
                    paginationMode="server"
                    paginationModel={{
                        page: (params.page || 1) - 1,
                        pageSize: params.size || 10,
                    }}
                    onPaginationModelChange={(model) =>
                        setParams((prev) => ({
                            ...prev,
                            page: model.page + 1,
                            size: model.pageSize,
                        }))
                    }
                    autoHeight
                    disableRowSelectionOnClick
                />
            </Card>
        </Box>
    );
};
