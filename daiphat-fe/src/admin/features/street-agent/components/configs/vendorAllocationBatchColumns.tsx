"use client";

import type { ReactNode } from "react";
import { Stack, Typography } from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { AdminRowActionsMenu } from "../../../../components/ui/AdminRowActionsMenu";
import { AdminStatusBadge } from "../../../../components/ui/AdminStatusBadge";
import type {
    StreetAgentProfile,
    VendorAllocationBatch,
} from "../../types/street-agent.type";
import { ALLOCATION_BATCH_STATUS_LABELS, getVendorAllocationBatchStatusBadgeClass } from "./constants";
import { formatDate, formatDateTime } from "../../utils/format";

const CellText = ({ children, className = "admin-cell-text" }: { children: ReactNode; className?: string }) => (
    <div className="flex h-full w-full items-center">
        <span className={className}>{children}</span>
    </div>
);

const CellTextCenter = ({ children }: { children: ReactNode }) => (
    <div className="flex h-full w-full items-center justify-center">
        <span className="admin-cell-text">{children}</span>
    </div>
);

const getProfileLabel = (profile?: StreetAgentProfile | null) => {
    if (!profile) return "—";
    const fullName = `${profile.lastName || ""} ${profile.firstName || ""}`.trim() || "Chưa có tên";
    return profile.phone ? `${fullName} — ${profile.phone}` : fullName;
};

const workflowStageLabel = (stage: string) => {
    switch (stage) {
        case "READY_FOR_RETURN": return "Sẵn sàng nhận vé trả";
        case "RETURN_ENTRY": return "Đang nhập vé trả";
        case "INSPECTION": return "Đang kiểm nhận";
        case "READY_FOR_SETTLEMENT": return "Chờ quyết toán";
        case "SETTLED": return "Đã quyết toán";
        default: return stage;
    }
};

const settlementLabel = (status: string) => {
    if (status === "CONFIRMED") return "Chờ mở phiên trả";
    if (status === "SETTLED") return "Đúng hạn";
    if (status === "LATE_SETTLED") return "Trễ hạn";
    if (status === "DRAFT") return "Chưa xác nhận";
    return "—";
};

export interface VendorAllocationBatchColumnActions {
    profileById: Map<number, StreetAgentProfile>;
    canEdit: boolean;
    canManage: boolean;
    onView: (batch: VendorAllocationBatch) => void;
    onContinueDraft: (batch: VendorAllocationBatch) => void;
    onConfirmDraft: (batch: VendorAllocationBatch) => void;
    onCancelDraft: (batch: VendorAllocationBatch) => void;
    onOpenReturn: (batch: VendorAllocationBatch) => void;
    onPreview: (batch: VendorAllocationBatch) => void;
    onSettle: (batch: VendorAllocationBatch) => void;
}

const ActionCell = ({
    row,
    actions,
}: {
    row: VendorAllocationBatch;
    actions: VendorAllocationBatchColumnActions;
}) => {
    const isDraft = row.status === "DRAFT";
    const isConfirmed = row.status === "CONFIRMED";
    const isReturnOpen = row.status === "RETURN_OPEN";
    const wfStage = row.returnWorkflow?.stage;

    const items = [
        {
            id: "view",
            label: "Xem chi tiết",
            icon: "view",
            onClick: () => actions.onView(row),
        },
        ...(isDraft
            ? [
                  {
                      id: "continue",
                      label: "Tiếp tục nháp",
                      icon: "edit",
                      onClick: () => actions.onContinueDraft(row),
                  },
                  ...(actions.canManage
                      ? [
                            {
                                id: "confirm",
                                label: "Xác nhận bàn giao",
                                icon: "detail",
                                onClick: () => actions.onConfirmDraft(row),
                            },
                            {
                                id: "cancel",
                                label: "Hủy phiếu nháp",
                                icon: "delete",
                                danger: true,
                                onClick: () => actions.onCancelDraft(row),
                            },
                        ]
                      : []),
              ]
            : []),
        ...(isConfirmed && actions.canEdit
            ? [
                  {
                      id: "open-return",
                      label: "Mở phiên nhận vé trả",
                      icon: "edit",
                      onClick: () => actions.onOpenReturn(row),
                  },
              ]
            : []),
        ...(isReturnOpen
            ? [
                  ...((wfStage === "RETURN_ENTRY" || wfStage === "INSPECTION") && actions.canEdit
                      ? [
                            {
                                id: "return",
                                label: "Nhận / kiểm vé trả",
                                icon: "edit",
                                onClick: () => actions.onView(row),
                            }
                        ]
                      : []),
                  ...(wfStage === "READY_FOR_SETTLEMENT"
                      ? [
                            {
                                id: "preview",
                                label: "Xem quyết toán",
                                icon: "detail",
                                onClick: () => actions.onPreview(row),
                            }
                        ]
                      : []),
              ]
            : []),
    ];

    return <AdminRowActionsMenu items={items} />;
};

export const getVendorAllocationBatchColumns = (
    actions: VendorAllocationBatchColumnActions
): GridColDef<VendorAllocationBatch>[] => [
    {
        field: "batchCode",
        headerName: "Mã phiếu",
        flex: 1.1,
        minWidth: 155,
        sortable: true,
        renderCell: (params: GridRenderCellParams<VendorAllocationBatch>) => (
            <CellText className="admin-cell-title">{params.row.batchCode || `#${params.row.id}`}</CellText>
        ),
    },
    {
        field: "vendor",
        headerName: "Người bán vé số",
        flex: 1.5,
        minWidth: 210,
        sortable: false,
        valueGetter: (_value, row) => getProfileLabel(actions.profileById.get(row.streetAgentProfileId)),
        renderCell: (params: GridRenderCellParams<VendorAllocationBatch>) => {
            const profile = actions.profileById.get(params.row.streetAgentProfileId);
            return (
                <Stack spacing={0.25} sx={{ py: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>{getProfileLabel(profile)}</Typography>
                    <Typography variant="caption" color="text.secondary">#{params.row.streetAgentProfileId}</Typography>
                </Stack>
            );
        },
    },
    {
        field: "businessDate",
        headerName: "Ngày kinh doanh",
        width: 135,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<VendorAllocationBatch>) => (
            <CellTextCenter>{formatDate(params.row.businessDate)}</CellTextCenter>
        ),
    },
    {
        field: "status",
        headerName: "Trạng thái",
        flex: 1.15,
        minWidth: 150,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<VendorAllocationBatch>) => {
            const isReturnOpen = params.row.status === "RETURN_OPEN";
            const label = isReturnOpen && params.row.returnWorkflow?.stage
                ? workflowStageLabel(params.row.returnWorkflow.stage)
                : (ALLOCATION_BATCH_STATUS_LABELS[params.row.status] || params.row.status);

            return (
                <CellTextCenter>
                    <AdminStatusBadge
                        label={label}
                        modifier={getVendorAllocationBatchStatusBadgeClass(params.row.status)}
                        className="admin-status-badge--compact"
                    />
                </CellTextCenter>
            );
        },
    },
    {
        field: "ticketSummary",
        headerName: "Vé",
        flex: 1.05,
        minWidth: 145,
        sortable: false,
        renderCell: (params: GridRenderCellParams<VendorAllocationBatch>) => (
            <Stack spacing={0.15} sx={{ py: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>Giao: {params.row.allocatedQuantity ?? 0}</Typography>
                <Typography variant="caption" color="text.secondary">
                    Trả {params.row.returnedQuantity ?? 0} · Bán {params.row.soldQuantity ?? 0}
                </Typography>
            </Stack>
        ),
    },
    {
        field: "returnWindow",
        headerName: "Hạn trả / giữ",
        flex: 1.15,
        minWidth: 170,
        sortable: false,
        renderCell: (params: GridRenderCellParams<VendorAllocationBatch>) => {
            const row = params.row;
            if (row.status === "DRAFT") {
                return <Stack spacing={0.2}><Typography variant="body2">Phiếu nháp</Typography><Typography variant="caption" color="text.secondary">{formatDateTime(row.reservationExpiresAt)}</Typography></Stack>;
            }
            if (row.returnCutoffSnapshot) {
                return <Stack spacing={0.2}><Typography variant="body2">{row.returnCutoffSnapshot}</Typography><Typography variant="caption" color="text.secondary">{settlementLabel(row.status)}</Typography></Stack>;
            }
            return <CellText>—</CellText>;
        },
    },
    {
        field: "actions",
        headerName: "",
        width: 64,
        sortable: false,
        filterable: false,
        align: "right",
        renderCell: (params: GridRenderCellParams<VendorAllocationBatch>) => <ActionCell row={params.row} actions={actions} />,
    },
];

export const vendorAllocationBatchColumnsInitialState = {
    columns: {
        columnVisibilityModel: {},
    },
};
