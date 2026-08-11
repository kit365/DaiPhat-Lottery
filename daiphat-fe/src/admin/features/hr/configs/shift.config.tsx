import { GridColDef } from "@mui/x-data-grid";
import { Chip, Typography } from "@mui/material";
import { Icon } from '@/admin/components/ui/AdminIcon';
import { AdminRowActionsMenu } from "@/admin/components/ui/AdminRowActionsMenu";

export const getShiftColumns = (onEdit: (id: string) => void, onDelete: (id: string) => void): GridColDef[] => [
    {
        field: "name",
        headerName: "Ca làm việc",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
            <Typography variant="subtitle2" sx={{ fontWeight: 600, py: 2 }}>
                {params.value}
            </Typography>
        )
    },
    {
        field: "department",
        headerName: "Phòng ban",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {params.row.departmentId?.name || "Tất cả"}
            </Typography>
        )
    },
    {
        field: "time",
        headerName: "Thời gian",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
            <Chip
                label={`${params.row.startTime} - ${params.row.endTime}`}
                size="small"
                variant="outlined"
                icon={<Icon icon="solar:clock-circle-bold" />}
                sx={{ fontWeight: 500 }}
            />
        )
    },
    {
        field: "status",
        headerName: "Trạng thái",
        width: 120,
        renderCell: (params) => (
            <Chip
                label={params.value === "active" ? "Hoạt động" : "Ngừng"}
                size="small"
                sx={{
                    fontWeight: 700,
                    bgcolor: params.value === "active" ? "rgba(34, 197, 94, 0.16)" : "rgba(255, 86, 48, 0.16)",
                    color: params.value === "active" ? "#118D57" : "#B71D18",
                }}
            />
        )
    },
    {
        field: "actions",
        headerName: "",
        width: 64,
        align: 'right',
        headerAlign: 'right',
        sortable: false,
        renderCell: (params) => (
            <AdminRowActionsMenu
                items={[
                    {
                        id: 'edit',
                        label: 'Chỉnh sửa',
                        icon: 'edit',
                        onClick: () => onEdit(params.row._id),
                    },
                    {
                        id: 'delete',
                        label: 'Xóa',
                        icon: 'delete',
                        onClick: () => onDelete(params.row._id),
                        danger: true,
                    },
                ]}
            />
        ),
    }
];
