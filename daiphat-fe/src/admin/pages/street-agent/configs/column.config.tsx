import Box from "@mui/material/Box";
import {
    GridActionsCellItem,
    GridColDef,
    GridRenderCellParams,
} from "@mui/x-data-grid";
import Avatar from "@mui/material/Avatar";
import EditIcon from "@mui/icons-material/Edit";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { STATUS_LABELS } from "./constants";

export const getColumnsConfig = (
    onEdit: (id: number) => void,
    page: number,
    pageSize: number
): GridColDef[] => [
    {
        field: "fullName",
        headerName: "Đại lý bán dạo",
        minWidth: 280,
        flex: 1.5,
        valueGetter: (_value, row) => `${row.lastName || ""} ${row.firstName || ""}`.trim(),
        renderCell: (params: GridRenderCellParams) => (
            <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
                <Avatar
                    alt={params.value as string}
                    src={params.row.imageUrl}
                    sx={{
                        width: 40,
                        height: 40,
                        fontWeight: 700,
                        bgcolor: "rgba(145, 158, 171, 0.12)",
                        color: "var(--palette-primary-main)",
                        fontSize: "1rem",
                    }}
                >
                    {params.row.lastName?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Stack spacing={0.25}>
                    <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--palette-text-primary)" }}
                    >
                        {params.value}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: "var(--palette-text-secondary)", fontSize: "0.75rem", fontWeight: 500 }}
                    >
                        {params.row.cccd || "—"}
                    </Typography>
                </Stack>
            </Stack>
        ),
    },
    {
        field: "contact",
        headerName: "Liên hệ",
        minWidth: 220,
        flex: 1,
        valueGetter: (_value, row) => row.phone,
        renderCell: (params: GridRenderCellParams) => (
            <Stack spacing={0.5} sx={{ py: 2, justifyContent: "center", height: "100%" }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--palette-text-primary)", fontSize: "0.875rem" }}>
                    {params.row.phone || "Chưa cập nhật"}
                </Typography>
                <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontSize: "0.75rem" }}>
                    {params.row.contactProvince || "Chưa cập nhật tỉnh/thành"}
                </Typography>
            </Stack>
        ),
    },
    {
        field: "coverageArea",
        headerName: "Địa bàn bán",
        minWidth: 160,
        flex: 1,
        valueFormatter: (value) => value || "—",
    },
    {
        field: "status",
        headerName: "Trạng thái",
        width: 140,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams) => {
            const status = params.value as string;
            let colorKey: "success" | "warning" | "default" = "default";
            if (status === "ACTIVE") colorKey = "success";
            else if (status === "PENDING") colorKey = "warning";

            return (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                    <span
                        className="minimal__label__root"
                        style={{
                            height: "24px",
                            minWidth: "24px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "2px 6px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            borderRadius: "6px",
                            color: `var(--palette-${colorKey}-dark)`,
                            backgroundColor: `rgba(var(--palette-${colorKey}-mainChannel) / calc(var(--opacity-soft-bg) * 100%))`,
                        }}
                    >
                        {STATUS_LABELS[status] || status || "—"}
                    </span>
                </Box>
            );
        },
    },
    {
        field: "actions",
        type: "actions",
        headerName: "",
        width: 80,
        align: "right",
        getActions: (params) => [
            <GridActionsCellItem
                key="edit-inline"
                icon={<EditIcon sx={{ fontSize: "20px !important" }} />}
                label="Chỉnh sửa"
                onClick={() => onEdit(Number(params.id))}
                sx={{ width: 36, height: 36, "& .MuiSvgIcon-root": { fontSize: "20px !important" } }}
            />,
            <GridActionsCellItem
                key="edit"
                icon={<EditIcon sx={{ fontSize: 20 }} />}
                label="Chỉnh sửa"
                onClick={() => onEdit(Number(params.id))}
                showInMenu
            />,
        ],
    },
];

export const columnsInitialState = {
    pagination: {
        paginationModel: {
            pageSize: 10,
        },
    },
};
