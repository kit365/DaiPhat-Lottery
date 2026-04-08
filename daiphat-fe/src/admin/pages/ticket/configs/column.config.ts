import { GridColDef } from "@mui/x-data-grid";
import { RenderActionsCell, RenderCreatedAtCell, RenderTicketCell, RenderStatusCell, RenderStockCell } from '../utils/render-cells';
import { ITicket } from "./types";

export const columnsConfig: GridColDef<ITicket>[] = [
    {
        field: "ticket",
        headerName: "Sản phẩm",
        flex: 1,
        hideable: false,
        filterable: true,
        renderCell: RenderTicketCell,
    },
    {
        field: "createdAt",
        headerName: "Thời gian tạo",
        width: 160,
        filterable: true,
        type: "date",
        renderCell: RenderCreatedAtCell,
    },
    {
        field: "stock",
        headerName: "Tình trạng",
        width: 160,
        filterable: false,
        renderCell: RenderStockCell,
    },
    {
        field: "price",
        headerName: "Giá",
        width: 120,
        filterable: true,
    },
    {
        field: "status",
        headerName: "Trạng thái",
        width: 120,
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
            createdAt: true,
            stock: true,
            price: true,
            status: true,
        },
    },
};



