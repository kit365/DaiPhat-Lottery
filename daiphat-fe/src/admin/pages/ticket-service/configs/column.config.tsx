import { GridColDef } from "@mui/x-data-grid";
import {
    RenderActionsCell,
    RenderTitleCell,
    RenderStatusCell,
    RenderPricingCell,
    RenderUserTicketTypesCell,
    RenderCategoryCell
} from '../utils/render-cells';
import { ITicketService } from "./types";

export const columnsConfig: GridColDef<ITicketService>[] = [
    {
        field: "name",
        headerName: "Tên dịch vụ",
        flex: 1,
        minWidth: 200,
        renderCell: RenderTitleCell,
    },
    {
        field: "categoryId",
        headerName: "Danh mục",
        width: 150,
        renderCell: RenderCategoryCell,
        valueGetter: (params: any) => params?.name || params,
    },
    {
        field: "pricingType",
        headerName: "Giá",
        width: 180,
        renderCell: RenderPricingCell,
    },
    {
        field: "duration",
        headerName: "Thời lượng",
        width: 120,
        valueFormatter: (value) => `${value} phút`,
    },
    {
        field: "userTicketTypes",
        headerName: "Loại UserTicket",
        width: 150,
        renderCell: RenderUserTicketTypesCell,
    },
    {
        field: "status",
        headerName: "Trạng thái",
        width: 120,
        renderCell: RenderStatusCell,
    },
    {
        field: 'actions',
        headerName: '',
        width: 80,
        sortable: false,
        align: 'right',
        renderCell: RenderActionsCell,
    },
];

export const columnsInitialState = {
    pagination: {
        paginationModel: { page: 0, pageSize: 10 },
    },
};




