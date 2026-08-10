"use client";

import type { ReactNode } from 'react';
import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Box } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { AdminRowActionsMenu } from '../../../../../components/ui/AdminRowActionsMenu';
import { ROUTES } from '../../../../../constants/routes';
import { formatVnd } from '../../../import-batch/utils/importCostCalculator';
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

const CellText = ({ children, className = 'admin-cell-text' }: { children: ReactNode; className?: string }) => (
    <div className="flex h-full w-full items-center">
        <span className={className}>{children}</span>
    </div>
);

const CellTextCenter = ({ children }: { children: ReactNode }) => (
    <div className="flex h-full w-full items-center justify-center">
        <span className="admin-cell-text">{children}</span>
    </div>
);

export const returnBatchColumnsConfig: GridColDef[] = [
    {
        field: 'stt',
        headerName: 'STT',
        width: 72,
        minWidth: 72,
        maxWidth: 72,
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
        minWidth: 155,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => {
            const rawCode = params.row.batchCode?.trim() || `#${params.row.id}`;
            return <CellText>{rawCode}</CellText>;
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
                    <span className="admin-cell-title">{supplierName}</span>
                    {supplierCode ? <span className="admin-cell-subtitle">{supplierCode}</span> : null}
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
        width: 100,
        minWidth: 96,
        maxWidth: 110,
        flex: 0,
        align: 'center',
        headerAlign: 'center',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <CellTextCenter>
                {new Intl.NumberFormat('vi-VN').format(params.row.totalQuantity ?? 0)}
            </CellTextCenter>
        ),
    },
    {
        field: 'totalReturnValue',
        headerName: 'Giá trị trả',
        type: 'number',
        width: 120,
        minWidth: 110,
        maxWidth: 130,
        flex: 0,
        align: 'center',
        headerAlign: 'center',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <CellTextCenter>{formatVnd(params.row.totalReturnValue)}</CellTextCenter>
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
            stt: { width: 72, maxWidth: 72, minWidth: 72 },
            totalReturnValue: { width: 120, maxWidth: 130, minWidth: 110 },
        },
    },
};
