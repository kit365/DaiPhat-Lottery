import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import type { ReturnBatch } from '../../types/returnBatch.type';
import {
    getReturnBatchStatusBadgeClass,
    getReturnBatchStatusLabel,
    isReturnBatchEditable,
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
                {isReturnBatchEditable(row.status) && (
                    <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                        <MenuItem
                            onClick={(e) => {
                                handleClose(e);
                                navigate(ROUTES.ADMIN.RETURN_BATCH.EDIT(row.id));
                            }}
                        >
                            <ListItemIcon>
                                <EditOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Chỉnh sửa</ListItemText>
                        </MenuItem>
                    </CanAccess>
                )}
            </Menu>
        </Box>
    );
};

export const returnBatchColumnsConfig: GridColDef[] = [
    {
        field: 'id',
        headerName: 'ID',
        width: 90,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Typography variant="body2" fontWeight={600} color="primary.main">
                #{params.row.id}
            </Typography>
        ),
    },
    {
        field: 'supplierName',
        headerName: 'Nhà cung cấp',
        flex: 1.5,
        minWidth: 200,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Box sx={{ py: 0.5 }}>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                    {params.row.supplierName || '—'}
                </Typography>
                {params.row.supplierCode && (
                    <Typography variant="caption" color="text.secondary" display="block">
                        {params.row.supplierCode}
                    </Typography>
                )}
            </Box>
        ),
    },
    {
        field: 'drawDate',
        headerName: 'Ngày quay',
        flex: 1,
        minWidth: 130,
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Typography variant="body2">
                {params.row.drawDate ? dayjs(params.row.drawDate).format('DD/MM/YYYY') : '—'}
            </Typography>
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
            <Typography variant="body2" fontWeight={600}>
                {new Intl.NumberFormat('vi-VN').format(params.row.totalQuantity ?? 0)}
            </Typography>
        ),
    },
    {
        field: 'totalReturnValue',
        headerName: 'Giá trị trả',
        type: 'number',
        flex: 1.2,
        minWidth: 150,
        align: 'right',
        headerAlign: 'right',
        sortable: true,
        renderCell: (params: GridRenderCellParams<ReturnBatch>) => (
            <Typography variant="body2" fontWeight={600} color="success.main">
                {formatImportCost(params.row.totalReturnValue)} VNĐ
            </Typography>
        ),
    },
    {
        field: 'status',
        headerName: 'Trạng thái',
        flex: 1.2,
        minWidth: 150,
        sortable: true,
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
