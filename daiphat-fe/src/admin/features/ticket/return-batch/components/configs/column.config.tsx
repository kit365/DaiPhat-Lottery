"use client";

import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Avatar, Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate } from '@/components/router-compat';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import type { ReturnBatch } from '../../types/returnBatch.type';
import {
    getReturnBatchStatusBadgeClass,
    getReturnBatchStatusLabel,
} from '../../utils/returnBatchLabels';

const ActionCell = ({ row }: { row: ReturnBatch }) => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (event?: React.MouseEvent) => {
        if (event) event.stopPropagation();
        setAnchorEl(null);
    };

    return (
        <Box onClick={(e) => e.stopPropagation()}>
            <IconButton size="small" onClick={handleOpen}>
                <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => handleClose()}
                onClick={(e) => e.stopPropagation()}
            >
                <MenuItem
                    onClick={(e) => {
                        handleClose(e);
                        navigate(ROUTES.ADMIN.RETURN_BATCH.DETAIL(row.id));
                    }}
                >
                    <ListItemIcon>
                        <VisibilityOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Xem chi tiết</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
};

export const returnBatchColumnsConfig: GridColDef[] = [
    {
        field: 'stt',
        headerName: 'STT',
        width: 70,
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
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1, minWidth: 0 }}>
                    <Avatar
                        sx={{
                            width: 34,
                            height: 34,
                            bgcolor: '#f1f5f9',
                            color: '#0284c7',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            border: '1px solid #e2e8f0',
                        }}
                    >
                        {initial}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} color="#1e293b" noWrap>
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
                                    border: '1px solid #f1f5f9',
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    display: 'inline-block',
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
        flex: 1,
        minWidth: 140,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Stack direction="row" spacing={0.75} alignItems="center">
                <CalendarTodayOutlinedIcon sx={{ fontSize: '0.9rem', color: '#94a3b8' }} />
                <Typography variant="body2" fontWeight={600} color="#334155">
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
        minWidth: 120,
        align: 'right',
        headerAlign: 'right',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Typography variant="body2" fontWeight={700} color="#1e293b">
                {new Intl.NumberFormat('vi-VN').format(params.row.totalQuantity ?? 0)}
            </Typography>
        ),
    },
    {
        field: 'totalReturnValue',
        headerName: 'Giá trị trả',
        type: 'number',
        flex: 1.2,
        minWidth: 160,
        align: 'right',
        headerAlign: 'right',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Typography variant="body2" fontWeight={700} color="#059669">
                {formatImportCost(params.row.totalReturnValue)} VNĐ
            </Typography>
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
