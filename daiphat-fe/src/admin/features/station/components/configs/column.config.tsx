import { GridColDef } from "@mui/x-data-grid";
import { DAYS_OF_WEEK } from "../../../../constants/schedule.constants";
import {
    RenderActionsCell,
    RenderTitleCell,
    RenderStatusCell,
    RenderCreatedAtCell
} from '../utils/render-cells';

const DAY_LABEL: Record<string, string> = Object.fromEntries(
    DAYS_OF_WEEK.map((d) => [d.value, d.shortLabel || d.label])
);

export const columnsConfig: GridColDef<any>[] = [
    {
        field: "name",
        headerName: "Tên nhà đài",
        flex: 1,
        minWidth: 200,
        hideable: false,
        renderCell: RenderTitleCell,
    },
    {
        field: "drawSchedule",
        headerName: "Lịch quay",
        width: 150,
        renderCell: (params) => {
            const drawDays = params.row.drawDays;
            const drawTime = params.row.drawTime;
            
            let formatted = 'Chưa có';
            if (drawDays && drawDays.length > 0) {
                const days = drawDays.map((d: string) => DAY_LABEL[d] || d).join(', ');
                formatted = `${days} (${drawTime || '--:--'})`;
            }
            
            return <span className="admin-cell-text">{formatted}</span>;
        }
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
        field: 'actions',
        headerName: '',
        width: 80,
        sortable: false,
        filterable: false,
        align: 'right',
        renderCell: RenderActionsCell,
    },
];

export const columnsInitialState = {};
