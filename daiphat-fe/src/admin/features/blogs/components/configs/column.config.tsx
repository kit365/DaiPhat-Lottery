import { GridColDef } from "@mui/x-data-grid";
import {
    getRenderActionsCell,
    RenderTitleCell,
    RenderStatusCell,
    RenderCreatedAtCell
} from '../utils/render-cells';
import { BlogCategoryResponse } from '../../types/blog-category.type';

export const getColumnsConfig = (isTrash: boolean): GridColDef<BlogCategoryResponse>[] => [
    {
        field: "name",
        headerName: "Tên danh mục",
        flex: 1,
        minWidth: 200,
        hideable: false,
        renderCell: RenderTitleCell,
    },
    {
        field: "parentName",
        headerName: "Danh mục cha",
        width: 180,
    },
    {
        field: "createdAt",
        headerName: "Thời gian tạo",
        width: 160,
        filterable: true,
        type: "dateTime",
        valueGetter: (value) => value ? new Date(value) : null,
        renderCell: (params) => <RenderCreatedAtCell value={params.value} />,
    },
    {
        field: "status",
        headerName: "Trạng thái",
        width: 140,
        renderCell: RenderStatusCell,
    },
    {
        field: "view",
        headerName: "Lượt xem",
        width: 140,
    },
    {
        field: 'actions',
        headerName: '',
        width: 80,
        sortable: false,
        filterable: false,
        align: 'right',
        renderCell: getRenderActionsCell(isTrash),
    },
];

export const columnsInitialState = {};




