import { Box, Card, Button, Typography, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tabs, Tab, styled } from "@mui/material";
import { DataGrid, GridColDef, GridActionsCell, GridActionsCellItem } from "@mui/x-data-grid";
import { Icon } from "@iconify/react";
import { Title } from "../../components/ui/Title";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { useState } from "react";
import { useTicketSubtypes, useCreateTicketSubtype, useUpdateTicketSubtype, useDeleteTicketSubtype } from "../../features/users/hooks/useTicketSubtype";
import { toast } from "react-toastify";
import { confirmDelete } from "../../utils/swal";
import { prefixAdmin } from "../../constants/routes";
import { Search } from "../../components/ui/Search";
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from "../../assets/icons";
import { DATA_GRID_LOCALE_VN } from "../../../shared/components/DataTable/localeText.config";
import { dataGridStyles } from "../ticket/configs/styles.config";
import { ExportImport } from "../../components/ui/ExportImport";

const TabBadge = styled('span')(() => ({
    height: "24px",
    minWidth: "24px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: "var(--shape-borderRadius-sm)",
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'all 0.2s',
}));

export const TicketSubtypeListPage = () => {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedTicketSubtype, setSelectedTicketSubtype] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "dog",
        description: ""
    });

    const params = {
        page: page + 1,
        limit: pageSize,
        keyword: search,
        type: typeFilter === "all" ? undefined : typeFilter,
    };

    const { data: res, isLoading } = useTicketSubtypes(params);
    const { mutate: createTicketSubtype } = useCreateTicketSubtype();
    const { mutate: updateTicketSubtype } = useUpdateTicketSubtype();
    const { mutate: deleteTicketSubtype } = useDeleteTicketSubtype();

    const ticketSubtypes = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const counts = {
        all: pagination.totalRecords || 0,
        dog: ticketSubtypes.filter((b: any) => b.type === "dog").length,
        cat: ticketSubtypes.filter((b: any) => b.type === "cat").length,
    };

    const handleOpenDialog = (ticketSubtype: any = null) => {
        if (ticketSubtype) {
            setSelectedTicketSubtype(ticketSubtype);
            setFormData({
                name: ticketSubtype.name,
                type: ticketSubtype.type,
                description: ticketSubtype.description || ""
            });
        } else {
            setSelectedTicketSubtype(null);
            setFormData({
                name: "",
                type: "dog",
                description: ""
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleSubmit = () => {
        if (!formData.name) {
            toast.error("Vui lòng nhập tên giống");
            return;
        }

        if (selectedTicketSubtype) {
            updateTicketSubtype({ id: selectedTicketSubtype._id, data: formData }, {
                onSuccess: () => {
                    toast.success("Cập nhật thành công");
                    handleCloseDialog();
                }
            });
        } else {
            createTicketSubtype(formData as any, {
                onSuccess: () => {
                    toast.success("Thêm mới thành công");
                    handleCloseDialog();
                }
            });
        }
    };

    const handleDelete = (id: string) => {
        confirmDelete("Bạn có chắc chắn muốn xóa vĩnh viễn giống này?", () => {
            deleteTicketSubtype(id, {
                onSuccess: () => {
                    toast.success("Xóa giống thành công");
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || "Lỗi khi xóa giống");
                }
            });
        });
    };

    const columns: GridColDef[] = [
        {
            field: "name",
            headerName: "Tên giống",
            flex: 1,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: "type",
            headerName: "Loài",
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{
                        height: '26px',
                        px: 2,
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: "var(--shape-borderRadius)",
                        bgcolor: params.value === "dog" ? 'var(--palette-primary-lighter)' : 'var(--palette-warning-lighter)',
                        color: params.value === "dog" ? 'var(--palette-primary-dark)' : 'var(--palette-warning-dark)',
                        fontSize: '1rem',
                        fontWeight: 700,
                    }}>
                        {params.value === "dog" ? "Chó" : "Mèo"}
                    </Box>
                </Box>
            )
        },
        {
            field: "actions",
            type: "actions",
            headerName: "",
            width: 80,
            sortable: false,
            filterable: false,
            headerAlign: 'center',
            align: 'center',
            renderCell: (params) => (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GridActionsCell {...params}>
                        <GridActionsCellItem
                            icon={<Icon icon="solar:pen-bold" width={20} />}
                            label="Chỉnh sửa"
                            onClick={() => handleOpenDialog(params.row)}
                            showInMenu
                            {...({
                                sx: {
                                    '& .MuiTypography-root': {
                                        fontSize: '0.8125rem',
                                        fontWeight: "600"
                                    },
                                },
                            } as any)}
                        />
                        <GridActionsCellItem
                            icon={<Icon icon="solar:trash-bin-trash-bold" width={20} style={{ color: 'var(--palette-error-main)' }} />}
                            label="Xóa"
                            onClick={() => handleDelete(params.row._id)}
                            showInMenu
                            {...({
                                sx: {
                                    '& .MuiTypography-root': {
                                        fontSize: '0.8125rem',
                                        fontWeight: "600",
                                        color: "var(--palette-error-main)"
                                    },
                                },
                            } as any)}
                        />
                    </GridActionsCell>
                </Box>
            )
        }
    ];

    return (
        <Box>
            <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Title title="Quản lý giống thú cưng" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Cài đặt", to: `/${prefixAdmin}/dashboard/settings` },
                            { label: "Giống thú cưng" }
                        ]}
                    />
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Icon icon="mingcute:add-line" />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                        bgcolor: 'var(--palette-text-primary)',
                        color: 'var(--palette-common-white)',
                        '&:hover': { bgcolor: 'var(--palette-grey-800)' },
                        borderRadius: 'var(--shape-borderRadius-md)',
                        textTransform: 'none',
                        px: 3,
                        py: 1,
                        fontSize: '0.875rem',
                        fontWeight: 700
                    }}
                >
                    Thêm giống mới
                </Button>
            </Box>

            <Card elevation={0} sx={{
                borderRadius: 'var(--shape-borderRadius-lg)',
                bgcolor: 'var(--palette-background-paper)',
                boxShadow: 'var(--customShadows-card)',
            }}>
                <Tabs
                    value={typeFilter}
                    onChange={(_e, val) => { setTypeFilter(val); setPage(0); }}
                    sx={{
                        px: '20px',
                        minHeight: "48px",
                        borderBottom: '1px solid var(--palette-background-neutral)',
                        '& .MuiTabs-flexContainer': { gap: "calc(5 * var(--spacing))" },
                        '& .MuiTabs-indicator': { backgroundColor: 'var(--palette-text-primary)', height: 2 },
                    }}
                >
                    <Tab
                        value="all"
                        disableRipple
                        label="Tất cả"
                        icon={<TabBadge sx={{
                            bgcolor: typeFilter === 'all' ? 'var(--palette-grey-800)' : 'var(--palette-background-neutral)',
                            color: typeFilter === 'all' ? 'var(--palette-common-white)' : 'var(--palette-text-secondary)'
                        }}>{counts.all}</TabBadge>}
                        iconPosition="end"
                        sx={{ minWidth: 0, padding: 0, minHeight: '48px', textTransform: 'none', fontSize: '0.875rem', fontWeight: 500, color: 'var(--palette-text-secondary)', flexDirection: 'row', '&.Mui-selected': { color: 'var(--palette-text-primary)', fontWeight: 600 } }}
                    />
                    <Tab
                        value="dog"
                        disableRipple
                        label="Chó"
                        icon={<TabBadge sx={{
                            bgcolor: typeFilter === 'dog' ? 'var(--palette-primary-main)' : 'var(--palette-primary-lighter)',
                            color: typeFilter === 'dog' ? 'var(--palette-common-white)' : 'var(--palette-primary-dark)'
                        }}>{counts.dog}</TabBadge>}
                        iconPosition="end"
                        sx={{ minWidth: 0, padding: 0, minHeight: '48px', textTransform: 'none', fontSize: '0.875rem', fontWeight: 500, color: 'var(--palette-text-secondary)', flexDirection: 'row', '&.Mui-selected': { color: 'var(--palette-text-primary)', fontWeight: 600 } }}
                    />
                    <Tab
                        value="cat"
                        disableRipple
                        label="Mèo"
                        icon={<TabBadge sx={{
                            bgcolor: typeFilter === 'cat' ? 'var(--palette-warning-main)' : 'var(--palette-warning-lighter)',
                            color: typeFilter === 'cat' ? 'var(--palette-common-white)' : 'var(--palette-warning-dark)'
                        }}>{counts.cat}</TabBadge>}
                        iconPosition="end"
                        sx={{ minWidth: 0, padding: 0, minHeight: '48px', textTransform: 'none', fontSize: '0.875rem', fontWeight: 500, color: 'var(--palette-text-secondary)', flexDirection: 'row', '&.Mui-selected': { color: 'var(--palette-text-primary)', fontWeight: 600 } }}
                    />
                </Tabs>

                <Box sx={{ p: "calc(2 * var(--spacing))", display: 'flex', gap: 2, alignItems: 'center', borderBottom: '1px dashed var(--palette-text-disabled)33' }}>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Search
                            maxWidth="100%"
                            placeholder="Tìm kiếm theo tên giống..."
                            value={search}
                            onChange={(val) => { setSearch(val); setPage(0); }}
                        />
                        <ExportImport />
                    </Box>
                </Box>

                <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 500 }}>
                    <DataGrid
                        className="admin-datagrid"
                        getRowHeight={() => 'auto'}
                        checkboxSelection
                        disableRowSelectionOnClick
                        rows={ticketSubtypes}
                        columns={columns}
                        getRowId={(row) => row._id}
                        loading={isLoading}
                        slots={{
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                            noRowsOverlay: () => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Typography sx={{ fontSize: '1rem', color: 'var(--palette-text-secondary)' }}>Không có dữ liệu để hiển thị</Typography>
                                </Box>
                            )
                        }}
                        localeText={DATA_GRID_LOCALE_VN}
                        pagination
                        paginationMode="server"
                        rowCount={pagination.totalRecords || 0}
                        paginationModel={{
                            page,
                            pageSize,
                        }}
                        onPaginationModelChange={(model) => {
                            setPage(model.page);
                            setPageSize(model.pageSize);
                        }}
                        pageSizeOptions={[5, 10, 25]}
                        sx={dataGridStyles}
                    />
                </Box>
            </Card>

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: "var(--shape-borderRadius-lg)", p: 1 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem', p: '1.5rem 1.5rem 1rem' }}>
                    {selectedTicketSubtype ? "Chỉnh sửa giống" : "Thêm giống mới"}
                </DialogTitle>
                <DialogContent sx={{ p: '0 1.5rem 1.5rem' }}>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Tên giống"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiInputBase-input': { fontSize: '1rem' } }}
                        />
                        <TextField
                            select
                            fullWidth
                            label="Loài"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiInputBase-input': { fontSize: '1rem' } }}
                        >
                            <MenuItem value="dog" sx={{ fontSize: '1rem' }}>Chó</MenuItem>
                            <MenuItem value="cat" sx={{ fontSize: '1rem' }}>Mèo</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            label="Mô tả"
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiInputBase-input': { fontSize: '1rem' } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: '1rem 1.5rem 1.5rem', borderTop: '1px dashed rgba(145, 158, 171, 0.2)' }}>
                    <Button onClick={handleCloseDialog} sx={{ fontSize: '0.875rem', textTransform: 'none', color: 'var(--palette-text-secondary)', fontWeight: 700 }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        sx={{
                            bgcolor: 'var(--palette-text-primary)',
                            color: 'white',
                            '&:hover': { bgcolor: "var(--palette-grey-700)" },
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            px: 3
                        }}
                    >
                        {selectedTicketSubtype ? "Lưu thay đổi" : "Thêm mới"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};




