import { GridColDef } from '@mui/x-data-grid';
import {
    RenderActionsCell,
    RenderPaymentProgressCell,
    RenderPeriodCell,
    RenderPaidAtCell,
    RenderStatusCell,
    RenderSupplierNameCell,
    RenderSettlementCodeCell,
} from '../utils/render-cells';

export const columnsConfig: GridColDef[] = [
    {
        field: 'supplierSettlementCode',
        headerName: 'Mã đối soát',
        flex: 1,
        minWidth: 160,
        hideable: false,
        renderCell: RenderSettlementCodeCell,
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
        field: 'paymentProgress',
        headerName: 'Tiến độ thanh toán',
        flex: 1.2,
        minWidth: 160,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: RenderPaymentProgressCell,
    },
    {
        field: 'status',
        headerName: 'Trạng thái',
        flex: 1,
        minWidth: 130,
        align: 'center',
        headerAlign: 'center',
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

export const columnsInitialState = {};
