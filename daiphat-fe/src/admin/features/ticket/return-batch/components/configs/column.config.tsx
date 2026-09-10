"use client";

import type { ReactNode } from 'react';
import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Box, Link, Tooltip, Typography } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { AdminRowActionsMenu } from '../../../../../components/ui/AdminRowActionsMenu';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import type { ReturnBatch } from '../../types/returnBatch.type';
import {
    getReturnBatchStatusBadgeClass,
    getReturnBatchStatusColorTheme,
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

const BatchCodeCell = ({ row }: { row: ReturnBatch }) => {
    const router = useAdminRouter();
    const rawCode = row.batchCode?.trim() || `#${row.id}`;
    const detailUrl = ROUTES.ADMIN.RETURN_BATCH.DETAIL(row.id);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Link
                href={detailUrl}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                        e.preventDefault();
                        router.push(detailUrl);
                    }
                }}
                underline="none"
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
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                        bgcolor: '#e2e8f0',
                        borderColor: '#cbd5e1',
                        color: 'var(--color-primary-admin, #0284c7)',
                        textDecoration: 'none',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                    },
                }}
                title={`Xem chi tiết phiếu trả ${rawCode}`}
            >
                {rawCode}
            </Link>
        </Box>
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
            const theme = getReturnBatchStatusColorTheme(params.row.status);
            return (
                <div className="flex h-full w-full min-w-0 items-center justify-center">
                    <Tooltip title={`Trạng thái: ${theme.label}`} arrow placement="right">
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 28,
                                height: 26,
                                px: 0.75,
                                borderRadius: '6px',
                                bgcolor: theme.bg,
                                color: theme.text,
                                border: `1.5px solid ${theme.border}`,
                                fontWeight: 800,
                                fontSize: '0.8125rem',
                                fontFamily: 'monospace',
                                cursor: 'default',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                    transform: 'scale(1.08)',
                                    boxShadow: `0 2px 6px ${theme.border}`,
                                },
                            }}
                        >
                            {sttNumber}
                        </Box>
                    </Tooltip>
                </div>
            );
        },
    },
    {
        field: 'batchCode',
        headerName: 'Mã phiếu',
        flex: 1.1,
        minWidth: 160,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => <BatchCodeCell row={params.row} />,
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
        field: 'returnedBy',
        headerName: 'Người thực hiện',
        flex: 1,
        minWidth: 140,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <span className="admin-cell-text">{params.row.returnedBy || '—'}</span>
            </Box>
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
        field: 'remainingInspectableQuantity',
        headerName: 'Vé ế còn lại',
        type: 'number',
        width: 130,
        minWidth: 120,
        maxWidth: 150,
        flex: 0,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 700,
                        color: (params.row.remainingInspectableQuantity ?? 0) > 0 ? '#c2410c' : '#64748b',
                    }}
                >
                    {new Intl.NumberFormat('vi-VN').format(params.row.remainingInspectableQuantity ?? 0)}{' '}
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
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
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
