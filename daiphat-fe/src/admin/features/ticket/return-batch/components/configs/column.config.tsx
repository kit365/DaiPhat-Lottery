"use client";

import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useNavigate } from '@/components/router-compat';
import { AdminRowActionsMenu } from '../../../../../components/ui/AdminRowActionsMenu';
import { ROUTES } from '../../../../../constants/routes';
import { formatVnd } from '../../../import-batch/utils/importCostCalculator';
import type { ReturnBatch } from '../../types/returnBatch.type';
import {
    getReturnBatchStatusBadgeClass,
    getReturnBatchStatusLabel,
} from '../../utils/returnBatchLabels';

import { returnBatchCodeMonospaceSx } from '../../utils/returnBatchCode';

const ActionCell = ({ row }: { row: ReturnBatch }) => {
    const navigate = useNavigate();

    return (
        <AdminRowActionsMenu
            items={[
                {
                    id: 'view',
                    label: 'Xem chi tiết',
                    icon: 'view',
                    onClick: () => navigate(ROUTES.ADMIN.RETURN_BATCH.DETAIL(row.id)),
                },
            ]}
        />
    );
};

export const returnBatchColumnsConfig: GridColDef[] = [
    {
        field: 'stt',
        headerName: 'STT',
        width: 60,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => {
            const api = params.api;
            const page = api.state?.pagination?.paginationModel?.page || 0;
            const pageSize = api.state?.pagination?.paginationModel?.pageSize || 10;
            let rowIndex = 0;
            try {
                const sortedRowIds = api.getSortedRowIds();
                const idx = sortedRowIds.indexOf(params.id);
                if (idx >= 0) rowIndex = idx;
            } catch {
                rowIndex = 0;
            }
            const sttNumber = page * pageSize + rowIndex + 1;
            return (
                <Typography variant="body2" fontWeight={700} color="#64748b">
                    {sttNumber}
                </Typography>
            );
        },
    },
    {
        field: 'batchCode',
        headerName: 'Mã phiếu',
        flex: 1.1,
        minWidth: 155,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => {
            const rawCode = params.row.batchCode?.trim() || `#${params.row.id}`;
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Typography
                        variant="body2"
                        sx={{
                            ...returnBatchCodeMonospaceSx,
                            color: '#FF3030',
                            bgcolor: '#FF303014',
                            px: 1,
                            py: 0.35,
                            borderRadius: '6px',
                            border: '1px solid #FF303026',
                            display: 'inline-block',
                            fontSize: '0.8125rem',
                            lineHeight: 1.2,
                        }}
                    >
                        {rawCode}
                    </Typography>
                </Box>
            );
        },
    },
    {
        field: 'supplierName',
        headerName: 'Nhà cung cấp',
        flex: 1.5,
        minWidth: 220,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => {
            const supplierName = params.row.supplierName || '—';
            const supplierCode = params.row.supplierCode;
            const initial = supplierName.charAt(0).toUpperCase();

            return (
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ py: 0.5, minWidth: 0, height: '100%' }}>
                    <Avatar
                        sx={{
                            width: 32,
                            height: 32,
                            bgcolor: '#f1f5f9',
                            color: '#0284c7',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            border: '1px solid #e2e8f0',
                            flexShrink: 0,
                        }}
                    >
                        {initial}
                    </Avatar>
                    <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <Typography
                            variant="body2"
                            fontWeight={700}
                            color="#1e293b"
                            noWrap
                            sx={{ lineHeight: 1.2, fontSize: '0.875rem' }}
                        >
                            {supplierName}
                        </Typography>
                        {supplierCode && (
                            <Typography
                                variant="caption"
                                sx={{
                                    fontFamily: 'monospace',
                                    color: '#64748b',
                                    bgcolor: '#f8fafc',
                                    px: 0.75,
                                    py: 0.1,
                                    borderRadius: '4px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    display: 'inline-block',
                                    width: 'fit-content',
                                    lineHeight: 1.2,
                                }}
                            >
                                {supplierCode}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            );
        },
    },
    {
        field: 'drawDate',
        headerName: 'Ngày quay',
        flex: 1.1,
        minWidth: 150,
        align: 'center',
        headerAlign: 'center',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ width: '100%', height: '100%' }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                <Typography variant="body2" fontWeight={600} color="#334155" sx={{ fontSize: '0.875rem' }}>
                    {params.row.drawDate ? dayjs(params.row.drawDate).format('DD/MM/YYYY') : '—'}
                </Typography>
            </Stack>
        ),
    },
    {
        field: 'totalQuantity',
        headerName: 'Số lượng',
        type: 'number',
        flex: 1,
        minWidth: 130,
        align: 'center',
        headerAlign: 'center',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="body2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.875rem' }}>
                    {new Intl.NumberFormat('vi-VN').format(params.row.totalQuantity ?? 0)}
                </Typography>
            </Box>
        ),
    },
    {
        field: 'totalReturnValue',
        headerName: 'Giá trị trả',
        type: 'number',
        flex: 1.25,
        minWidth: 165,
        align: 'right',
        headerAlign: 'right',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', pr: 1 }}>
                <Typography variant="body2" fontWeight={700} color="#16a34a" sx={{ fontSize: '0.875rem' }}>
                    {formatVnd(params.row.totalReturnValue)}
                </Typography>
            </Box>
        ),
    },
    {
        field: 'status',
        headerName: 'Trạng thái',
        flex: 1.2,
        minWidth: 180,
        sortable: true,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <span className={`admin-status-badge ${getReturnBatchStatusBadgeClass(params.row.status)}`}>
                {getReturnBatchStatusLabel(params.row.status, params.row.statusLabel)}
            </span>
        ),
    },
    {
        field: 'actions',
        headerName: '',
        width: 60,
        sortable: false,
        filterable: false,
        align: 'right',
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => <ActionCell row={params.row} />,
    },
];

export const returnBatchColumnsInitialState = {
    columns: {
        columnVisibilityModel: {},
    },
};
