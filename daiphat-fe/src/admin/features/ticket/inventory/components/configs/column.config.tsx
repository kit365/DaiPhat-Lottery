import { GridColDef } from '@mui/x-data-grid';
import { formatImportBatchCode } from '../../../import-batch/utils/importBatchCode';
import { ITicket } from '../../types/ticket.type';
import {
    RenderActionsCell,
    RenderTicketCell,
    RenderStatusCell,
    RenderCreatedAtCell,
    RenderDrawDateCell,
} from '../utils/render-cells';

export const columnsConfig: GridColDef<ITicket>[] = [
    {
        field: 'ticket',
        headerName: 'Vé số',
        flex: 1,
        hideable: false,
        filterable: true,
        renderCell: RenderTicketCell,
    },
    {
        field: 'drawDate',
        headerName: 'Ngày quay',
        width: 140,
        filterable: true,
        renderCell: (params) => <RenderDrawDateCell {...params} />,
    },
    {
        field: 'batchCode',
        headerName: 'Lô nhập',
        width: 220,
        filterable: true,
        renderCell: (params) => (
            <span className="admin-cell-text" title={String(params.value ?? '')}>
                {formatImportBatchCode(params.value as string)}
            </span>
        ),
    },
    {
        field: 'createdAt',
        headerName: 'Nhập lúc',
        width: 160,
        filterable: true,
        type: 'date',
        valueGetter: (value) => (value ? new Date(value) : null),
        renderCell: (params) => <RenderCreatedAtCell value={params.value} />,
    },
    {
        field: 'status',
        headerName: 'Trạng thái',
        width: 140,
        filterable: false,
        renderCell: RenderStatusCell,
    },
    {
        field: 'actions',
        headerName: '',
        sortable: false,
        filterable: false,
        hideable: false,
        disableColumnMenu: true,
        width: 80,
        align: 'right',
        renderCell: RenderActionsCell,
    },
];

export const columnsInitialState = {
    pagination: {
        paginationModel: { page: 0, pageSize: 10 },
    },
};
