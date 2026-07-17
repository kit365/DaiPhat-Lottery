import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataGrid } from "@mui/x-data-grid";
import {
    Box,
    Card,
    CircularProgress,
    Tab,
    Tabs,
    styled,
} from "@mui/material";
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from "../../../../assets/icons";
import { getColumnsConfig, columnsInitialState } from "../configs/column.config";
import { DATA_GRID_LOCALE_VN } from "../../../../../shared/components/DataTable/localeText.config";
import { useStreetAgentProfiles } from "../../hooks/useStreetAgent";
import { ROUTES } from "../../../../constants/routes";
import { STATUS_OPTIONS } from "../configs/constants";
import { Search } from "../../../../components/ui/Search";
import { ExportImport } from "../../../../components/ui/ExportImport";
import { getTabBadgeStyles } from "../../../../utils/badge";
import { dataGridStyles } from "../../../../shared/data-grid";

const TabBadge = styled("span")(() => ({
    height: "24px",
    minWidth: "24px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "8px",
    padding: "0px 6px",
    borderRadius: "var(--shape-borderRadius-sm, 6px)",
    fontSize: "0.75rem",
    fontWeight: 700,
    transition: "all 0.2s",
}));

export const StreetAgentList = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const params = useMemo(
        () => ({
            page: page + 1,
            limit: pageSize,
            search: search || undefined,
            status: status === "all" ? undefined : status,
        }),
        [page, pageSize, search, status]
    );

    const { data: res, isLoading } = useStreetAgentProfiles(params);

    const profiles = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const handleEdit = (id: number) => {
        navigate(`${ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.EDIT}/${id}`);
    };

    const handleStatusChange = (_event: React.SyntheticEvent, newValue: string) => {
        setStatus(newValue);
        setPage(0);
    };

    const columns = useMemo(
        () => getColumnsConfig(handleEdit, page, pageSize),
        [page, pageSize]
    );

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: "var(--shape-borderRadius-lg)",
                bgcolor: "var(--palette-background-paper)",
                boxShadow: "var(--customShadows-card)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Tabs
                value={status}
                onChange={handleStatusChange}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                    px: "20px",
                    minHeight: "48px",
                    borderBottom: "1px solid var(--palette-background-neutral)",
                    "& .MuiTabs-flexContainer": { gap: "calc(5 * var(--spacing))" },
                    "& .MuiTabs-indicator": { backgroundColor: "var(--palette-text-primary)", height: 2 },
                }}
            >
                {STATUS_OPTIONS.map((option) => (
                    <Tab
                        key={option.value}
                        value={option.value}
                        disableRipple
                        label={option.label}
                        icon={
                            <TabBadge sx={getTabBadgeStyles(option.value, status === option.value)}>
                                {option.value === "all" ? pagination.totalRecords || 0 : 0}
                            </TabBadge>
                        }
                        iconPosition="end"
                        sx={{
                            minWidth: 0,
                            padding: "0",
                            minHeight: "48px",
                            textTransform: "none",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            color: "var(--palette-text-secondary)",
                            flexDirection: "row",
                            "&.Mui-selected": {
                                color: "var(--palette-text-primary)",
                                fontWeight: 600,
                            },
                        }}
                    />
                ))}
            </Tabs>

            <Box
                sx={{
                    p: "calc(2 * var(--spacing))",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed var(--palette-text-disabled)33",
                }}
            >
                <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Search
                        placeholder="Tìm kiếm đại lý bán dạo..."
                        value={search}
                        onChange={(val) => {
                            setSearch(val);
                            setPage(0);
                        }}
                        maxWidth="100%"
                    />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <ExportImport />
                </Box>
            </Box>

            <Box sx={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 640 }}>
                <DataGrid
                    className="admin-datagrid"
                    rows={profiles}
                    getRowId={(row) => row.id}
                    loading={isLoading}
                    columns={columns}
                    density="comfortable"
                    slots={{
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
                        noRowsOverlay: () => (
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                {isLoading ? (
                                    <CircularProgress size={32} />
                                ) : (
                                    <span className="admin-datagrid-empty">Không có dữ liệu</span>
                                )}
                            </Box>
                        ),
                    }}
                    localeText={DATA_GRID_LOCALE_VN}
                    pagination
                    paginationMode="server"
                    rowCount={pagination.totalRecords || 0}
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={(model) => {
                        setPage(model.page);
                        setPageSize(model.pageSize);
                    }}
                    pageSizeOptions={[5, 10, 20]}
                    initialState={columnsInitialState}
                    getRowHeight={() => "auto"}
                    disableRowSelectionOnClick
                    sx={{ ...dataGridStyles, height: 640 }}
                />
            </Box>
        </Card>
    );
};

export default StreetAgentList;
