import { GridColDef } from '@mui/x-data-grid';
import {
    RenderActionsCell,
    RenderMoneyCell,
    RenderRemainingMoneyCell,
    RenderPeriodCell,
    RenderPaidAtCell,
    RenderStatusCell,
    RenderSupplierNameCell,
} from '../utils/render-cells';

export const columnsConfig: GridColDef[] = [
    {
        field: 'supplierSettlementCode',
        headerName: 'Mã đối soát',
        flex: 1,
        minWidth: 160,
        hideable: false,
        valueGetter: (_value, row) => row.supplierSettlementCode || (row.id != null ? `#${row.id}` : '—'),
    },
    {
        field: 'supplierName',
        headerName: 'Nhà cung cấp',
        flex: 1.3,
        minWidth: 190,
        hideable: false,
        renderCell: RenderSupplierNameCell,
    },
    {
        field: 'periodFrom',
        headerName: 'Kỳ đối soát',
        flex: 1.2,
        minWidth: 205,
        renderCell: RenderPeriodCell,
    },
    {
        field: 'totalImportValue',
        headerName: 'Giá trị nhập',
        flex: 1,
        minWidth: 135,
        align: 'right',
        headerAlign: 'right',
        renderCell: RenderMoneyCell,
    },
    {
        field: 'totalReturnValue',
        headerName: 'Giá trị trả',
        flex: 1,
        minWidth: 135,
        align: 'right',
        headerAlign: 'right',
        renderCell: RenderMoneyCell,
    },
    {
        field: 'totalPaidAmount',
        headerName: 'Đã thanh toán',
        flex: 1,
        minWidth: 135,
        align: 'right',
        headerAlign: 'right',
        renderCell: RenderMoneyCell,
    },
    {
        field: 'remainingAmount',
        headerName: 'Còn phải trả',
        flex: 1,
        minWidth: 135,
        align: 'right',
        headerAlign: 'right',
        renderCell: RenderRemainingMoneyCell,
    },
    {
        field: 'status',
        headerName: 'Trạng thái',
        flex: 1,
        minWidth: 130,
        align: 'right',
        headerAlign: 'right',
        renderCell: RenderStatusCell,
    },
    {
        field: 'actions',
        headerName: '',
        width: 50,
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
