import Box from "@mui/material/Box";
import {
    GridColDef,
    GridRenderCellParams,
} from "@mui/x-data-grid";
import Avatar from "@mui/material/Avatar";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { AdminRowActionsMenu } from "../../../../components/ui/AdminRowActionsMenu";
import { AdminStatusBadge } from "../../../../components/ui/AdminStatusBadge";
import { STATUS_LABELS } from "./constants";
import { formatCoverageAreaDisplay } from "../../constants/coverageAreas";
import { formatVendorHandoverLimit } from "../../utils/format";

export const getColumnsConfig = (
    onEdit: (id: number) => void,
    onResumeOnboarding: (id: number) => void,
    _page: number,
    _pageSize: number
): GridColDef[] => [
    {
        field: "fullName",
        headerName: "Người bán vé số",
        minWidth: 200,
        flex: 0.9,
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
        minWidth: 200,
        flex: 0.9,
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
        headerName: "Khu vực bán",
        minWidth: 120,
        flex: 0.8,
        valueFormatter: (value) => formatCoverageAreaDisplay(value),
    },
    {
        field: "effectiveDailyCap",
        headerName: "Giới hạn giao hiện tại",
        minWidth: 160,
        width: 160,
        headerAlign: "center",
        align: "center",
        valueFormatter: (value) => formatVendorHandoverLimit(value),
    },
    {
        field: "contractCode",
        headerName: "Hợp đồng",
        minWidth: 200,
        width: 200,
        valueFormatter: (value) => value || "—",
    },
    {
        field: "status",
        headerName: "Trạng thái",
        width: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams) => {
            const status = params.value as string;

            return (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                    <AdminStatusBadge
                        label={STATUS_LABELS[status] || status || "—"}
                        modifier={
                            status === "ACTIVE"
                                ? "admin-status-badge--success"
                                : status === "PENDING"
                                  ? "admin-status-badge--pending"
                                  : "admin-status-badge--draft"
                        }
                    />
                </Box>
            );
        },
    },
    {
        field: "actions",
        headerName: "",
        width: 80,
        sortable: false,
        align: "right",
        renderCell: (params: GridRenderCellParams) => {
            const needsOnboarding =
                params.row.status === "PENDING" && !params.row.contractDocumentUrl;

            return (
                <AdminRowActionsMenu
                    items={[
                        ...(needsOnboarding
                            ? [
                                  {
                                      id: "resume",
                                      label: "Hoàn thiện HĐ",
                                      icon: <AssignmentTurnedInIcon sx={{ fontSize: 20 }} />,
                                      onClick: () => onResumeOnboarding(Number(params.id)),
                                  },
                              ]
                            : []),
                        {
                            id: "edit",
                            label: "Chỉnh sửa",
                            icon: 'edit',
                            onClick: () => onEdit(Number(params.id)),
                        },
                    ]}
                />
            );
        },
    },
];

export const columnsInitialState = {};
