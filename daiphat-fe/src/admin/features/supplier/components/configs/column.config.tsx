import { GridColDef } from '@mui/x-data-grid';
import {
    RenderActionsCell,
    RenderNameCell,
    RenderStatusCell,
    RenderTypeCell,
} from '../utils/render-cells';

export const columnsConfig: GridColDef[] = [
    {
        field: 'name',
        headerName: 'Tên',
        flex: 1.2,
        minWidth: 180,
        hideable: false,
        renderCell: RenderNameCell,
    },
    {
        field: 'code',
        headerName: 'Mã',
        flex: 0.8,
        minWidth: 120,
        renderCell: (params) => <span className="admin-cell-text">{params.value}</span>,
    },
    {
        field: 'type',
        headerName: 'Loại',
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        renderCell: RenderTypeCell,
    },
    {
        field: 'contactPhone',
        headerName: 'Số điện thoại',
        flex: 0.9,
        minWidth: 140,
        renderCell: (params) => <span className="admin-cell-text">{params.value}</span>,
    },
    {
        field: 'isActive',
        headerName: 'Trạng thái',
        flex: 0.8,
        minWidth: 130,
        renderCell: RenderStatusCell,
    },
    {
        field: 'actions',
        headerName: '',
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'right',
        renderCell: RenderActionsCell,
    },
];

export const columnsInitialState = {};
