import { GridColDef } from "@mui/x-data-grid";
import { RenderActionsCell, RenderCreatedAtCell, RenderTicketCell, RenderStatusCell, RenderStockCell } from '../utils/render-cells';
import { ITicket } from "./types";

export const columnsConfig: GridColDef<ITicket>[] = [
    {
        field: "ticket",
        headerName: "Vé số",
        flex: 1,
        hideable: false,
        filterable: true,
        renderCell: RenderTicketCell,
    },
    {
        field: "drawDate",
        headerName: "Ngày quay",
        width: 140,
        filterable: true,
    },
    {
        field: "batchCode",
        headerName: "Lô nhập",
        width: 140,
        filterable: true,
    },
    {
        field: "createdAt",
        headerName: "Nhập lúc",
        width: 160,
        filterable: true,
        type: "date",
        renderCell: RenderCreatedAtCell,
    },
    {
        field: "status",
        headerName: "Trạng thái",
        width: 160,
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
        width: 64,
        align: 'right',
        renderCell: RenderActionsCell,
    },
];

export const columnsInitialState = {
    pagination: {
        paginationModel: {
            page: 0,
            pageSize: 10,
        },
    },
    columns: {
        columnVisibilityModel: {
            ticket: true,
            drawDate: true,
            batchCode: true,
            createdAt: true,
            status: true,
        },
    },
};



