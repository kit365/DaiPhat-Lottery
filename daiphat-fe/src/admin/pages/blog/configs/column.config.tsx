import { GridColDef } from "@mui/x-data-grid";
import {
    RenderActionsCell,
    RenderTitleCell,
    RenderCreatedAtCell
} from '../utils/render-cells';

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const status = params.row.status?.toUpperCase();

    let label = "Bản nháp";
    let bg = "var(--palette-text-disabled)29";
    let text = "var(--palette-text-secondary)";

    if (status === "PUBLISHED" || status === "Xuất bản") {
        label = "Xuất bản";
        bg = "var(--palette-info-lighter)";
        text = "var(--palette-info-dark)";
    } else if (status === "ARCHIVED") {
        label = "Lưu trữ";
        bg = "var(--palette-error-lighter)";
        text = "var(--palette-error-dark)";
    } else if (status === "DRAFT") {
        label = "Bản nháp";
        bg = "var(--palette-warning-lighter)";
        text = "var(--palette-warning-dark)";
    }

    return (
        <span
            className="minimal__label__root"
            style={{
                backgroundColor: bg,
                color: text,
            }}
        >
            {label}
        </span>
    );
};

export const columnsConfig: GridColDef<any>[] = [
    {
        field: "title",
        headerName: "Bài viết",
        flex: 1,
        minWidth: 200,
        hideable: false,
        renderCell: RenderTitleCell,
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
        align: 'center',
        renderCell: RenderStatusCell,
    },
    {
        field: 'actions',
        headerName: '',
        width: 80,
        sortable: false,
        filterable: false,
        align: 'right',
        renderCell: RenderActionsCell,
    },
];

export const columnsInitialState = {
    pagination: {
        paginationModel: { page: 0, pageSize: 10 },
    },
};




