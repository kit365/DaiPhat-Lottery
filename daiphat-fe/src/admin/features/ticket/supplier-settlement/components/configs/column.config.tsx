import { GridColDef } from '@mui/x-data-grid';
import {
    RenderActionsCell,
    RenderMoneyCell,
    RenderPeriodCell,
    RenderStatusCell,
    RenderSupplierNameCell,
} from '../utils/render-cells';

export const columnsConfig: GridColDef[] = [
    {
        field: 'supplierName',
        headerName: 'Nhà cung cấp',
        flex: 1.2,
        minWidth: 180,
        hideable: false,
        renderCell: RenderSupplierNameCell,
    },
    {
        field: 'supplierCode',
        headerName: 'Mã NCC',
        flex: 0.7,
        minWidth: 110,
        renderCell: (params) => <span className="admin-cell-text">{params.value || '—'}</span>,
    },
    {
        field: 'periodFrom',
        headerName: 'Kỳ đối soát',
        flex: 1.1,
        minWidth: 180,
        renderCell: RenderPeriodCell,
    },
    {
        field: 'totalImportValue',
        headerName: 'Giá trị nhập',
        flex: 1,
        minWidth: 140,
        align: 'right',
        headerAlign: 'right',
        renderCell: RenderMoneyCell,
    },
    {
        field: 'totalPaidAmount',
        headerName: 'Đã thanh toán',
        flex: 1,
        minWidth: 140,
        align: 'right',
        headerAlign: 'right',
        renderCell: RenderMoneyCell,
    },
    {
        field: 'remainingAmount',
        headerName: 'Còn lại',
        flex: 1,
        minWidth: 140,
        align: 'right',
        headerAlign: 'right',
        renderCell: RenderMoneyCell,
    },
    {
        field: 'status',
        headerName: 'Trạng thái',
        flex: 0.8,
        minWidth: 120,
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

export const columnsInitialState = {
    pagination: {
        paginationModel: { page: 0, pageSize: 10 },
    },
};
