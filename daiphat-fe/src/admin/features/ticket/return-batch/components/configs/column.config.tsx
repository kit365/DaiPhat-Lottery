"use client";

import type { ReactNode } from 'react';
import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Box, Typography } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { AdminRowActionsMenu } from '../../../../../components/ui/AdminRowActionsMenu';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import type { ReturnBatch } from '../../types/returnBatch.type';
import {
    getReturnBatchStatusBadgeClass,
    getReturnBatchStatusLabel,
} from '../../utils/returnBatchLabels';

const ActionCell = ({ row }: { row: ReturnBatch }) => {
    const router = useAdminRouter();

    return (
        <AdminRowActionsMenu
            items={[
                {
                    id: 'view',
                    label: 'Xem chi tiết',
                    icon: 'view',
                    onClick: () => router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(row.id)),
                },
            ]}
        />
    );
};

const CellTextCenter = ({ children }: { children: ReactNode }) => (
    <div className="flex h-full w-full min-w-0 items-center justify-center">
        <span className="admin-cell-text" title={typeof children === "string" ? children : undefined}>{children}</span>
    </div>
);

export const returnBatchColumnsConfig: GridColDef[] = [
    {
        field: 'stt',
        headerName: 'STT',
        width: 64,
        minWidth: 64,
        maxWidth: 64,
        flex: 0,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        resizable: false,
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
            return <CellTextCenter>{sttNumber}</CellTextCenter>;
        },
    },
    {
        field: 'batchCode',
        headerName: 'Mã phiếu',
        flex: 1.1,
        minWidth: 160,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => {
            const rawCode = params.row.batchCode?.trim() || `#${params.row.id}`;
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Box
                        sx={{
                            px: 1.25,
                            py: 0.5,
                            borderRadius: '8px',
                            bgcolor: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            color: '#0f172a',
                            letterSpacing: '0.02em',
                        }}
                    >
                        {rawCode}
                    </Box>
                </Box>
            );
        },
    },
    {
        field: 'supplierName',
        headerName: 'Nhà cung cấp',
        flex: 1.5,
        minWidth: 190,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => {
            const supplierName = params.row.supplierName || '—';
            const supplierCode = params.row.supplierCode;

            return (
                <div className="flex flex-col gap-0.5 py-1">
                    <span className="admin-cell-title" style={{ fontWeight: 700, color: '#0f172a' }}>{supplierName}</span>
                    {supplierCode ? <span className="admin-cell-subtitle" style={{ fontSize: '0.75rem', color: '#64748b' }}>{supplierCode}</span> : null}
                </div>
            );
        },
    },
    {
        field: 'drawDate',
        headerName: 'Ngày quay',
        width: 120,
        minWidth: 112,
        maxWidth: 128,
        flex: 0,
        align: 'center',
        headerAlign: 'center',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <CellTextCenter>
                {params.row.drawDate ? dayjs(params.row.drawDate).format('DD/MM/YYYY') : '—'}
            </CellTextCenter>
        ),
    },
    {
        field: 'totalQuantity',
        headerName: 'Số lượng',
        type: 'number',
        width: 110,
        minWidth: 100,
        maxWidth: 130,
        flex: 0,
        align: 'center',
        headerAlign: 'center',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                    {new Intl.NumberFormat('vi-VN').format(params.row.totalQuantity ?? 0)}{' '}
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>vé</span>
                </Typography>
            </Box>
        ),
    },
    {
        field: 'totalReturnValue',
        headerName: 'Giá trị trả',
        type: 'number',
        width: 150,
        minWidth: 135,
        maxWidth: 170,
        flex: 0,
        align: 'center',
        headerAlign: 'center',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {formatImportCost(params.row.totalReturnValue)} VNĐ
                </Typography>
            </Box>
        ),
    },
    {
        field: 'status',
        headerName: 'Trạng thái',
        flex: 1.2,
        minWidth: 160,
        sortable: true,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%' }}>
                <span className={`admin-status-badge ${getReturnBatchStatusBadgeClass(params.row.status)}`}>
                    {getReturnBatchStatusLabel(params.row.status, params.row.statusLabel)}
                </span>
            </Box>
        ),
    },
    {
        field: 'actions',
        headerName: '',
        width: 50,
        sortable: false,
        filterable: false,
        align: 'right',
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => <ActionCell row={params.row} />,
    },
];

export const returnBatchColumnsInitialState = {
    columns: {
        columnVisibilityModel: {},
        dimensions: {
            stt: { width: 64, maxWidth: 64, minWidth: 64 },
            totalReturnValue: { width: 150, maxWidth: 170, minWidth: 135 },
        },
    },
};
