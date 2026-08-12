import { GridColDef } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { AdminStatusBadge } from '../../../../components/ui/AdminStatusBadge';
import { AdminRowActionsMenu } from '../../../../components/ui/AdminRowActionsMenu';
import {
    getDrawResultStatusBadgeClass,
    getDrawResultStatusLabel,
} from '../../utils/drawResultLabels';

const BadgeCell = ({ children }: { children: ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        {children}
    </Box>
);

export const columnsConfig = (onViewDetails: (id: number) => void): GridColDef[] => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'stationName', headerName: 'Đài Quay', flex: 1, minWidth: 150 },
    { field: 'region', headerName: 'Khu Vực', width: 120 },
    { 
        field: 'drawDate', 
        headerName: 'Ngày Quay', 
        width: 130,
        renderCell: (params) => (
            <span className="date-text">{dayjs(params.value).format('DD/MM/YYYY')}</span>
        )
    },
    { 
        field: 'status', 
        headerName: 'Trạng Thái', 
        width: 150,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
            <BadgeCell>
                <AdminStatusBadge
                    label={getDrawResultStatusLabel(params.value)}
                    modifier={getDrawResultStatusBadgeClass(params.value)}
                    className="admin-status-badge--compact"
                />
            </BadgeCell>
        )
    },
    { field: 'source', headerName: 'Nguồn', width: 120 },
    {
        field: 'detailCount',
        headerName: 'Số giải đã có',
        width: 130,
    },
    {
        field: 'actions',
        headerName: '',
        width: 50,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
            <AdminRowActionsMenu
                items={[
                    {
                        id: 'view',
                        label: 'Chi tiết',
                        icon: 'view',
                        onClick: () => onViewDetails(params.row.id),
                    },
                ]}
            />
        ),
    },
];

export const columnsInitialState = {
    pagination: { paginationModel: { pageSize: 10 } },
};
