import { useState } from 'react';
import {
    Box,
    Card,
    Button,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { Title } from "../../components/ui/Title";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { prefixAdmin } from "../../constants/routes";
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from './hooks/useDepartments';
import { getDepartmentColumns } from './configs/department.config';
import { DepartmentDialog } from './sections/DepartmentDialog';
import { toast } from 'react-toastify';
import { dataGridCardStyles, dataGridContainerStyles, dataGridStyles, primaryButtonStyles } from './configs/styles.config';
import { HRToolbar } from './sections/HRToolbar';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../assets/icons';
import { confirmDelete } from "../../utils/swal";

export const DepartmentListPage = () => {
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const localeText = useDataGridLocale();

    const params = {
        page: page + 1,
        limit: pageSize,
        keyword: search,
    };

    const { data: res, isLoading } = useDepartments(params);
    const departments = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const { mutate: createDept } = useCreateDepartment();
    const { mutate: updateDept } = useUpdateDepartment();
    const { mutate: deleteDept } = useDeleteDepartment();

    const handleOpenDialog = (item?: any) => {
        setSelectedItem(item);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedItem(null);
    };

    const handleSave = (data: any) => {
        if (selectedItem) {
            updateDept({ id: selectedItem._id, data }, {
                onSuccess: () => {
                    toast.success('Cập nhật thành công');
                    handleCloseDialog();
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
                }
            });
        } else {
            createDept(data, {
                onSuccess: () => {
                    toast.success('Thêm thành công');
                    handleCloseDialog();
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
                }
            });
        }
    };

    const handleDelete = (id: string) => {
        confirmDelete("Bạn có chắc chắn muốn xóa phòng ban này?", () => {
            deleteDept(id, {
                onSuccess: () => {
                    toast.success('Xóa thành công');
                }
            });
        });
    };

    const columns = getDepartmentColumns(
        (id) => handleOpenDialog(departments.find((d: any) => d._id === id)),
        handleDelete
    );

    return (
        <Box sx={{ p: "calc(3 * var(--spacing))" }}>
            <Box sx={{ mb: '40px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Title title="Quản lý Phòng ban" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: `/${prefixAdmin}` },
                            { label: "Quản lý Nhân sự" },
                            { label: "Phòng ban" }
                        ]}
                    />
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={primaryButtonStyles}
                >
                    Tạo phòng ban
                </Button>
            </Box>

            <Card sx={dataGridCardStyles}>
                <Box sx={dataGridContainerStyles}>
                    <DataGrid
                        rows={departments}
                        columns={columns}
                        getRowId={(row) => row._id}
                        loading={isLoading}
                        checkboxSelection
                        disableRowSelectionOnClick
                        localeText={localeText}
                        slots={{
                            toolbar: HRToolbar as any,
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                        }}
                        slotProps={{
                            toolbar: {
                                searchPlaceholder: "Tìm kiếm phòng ban...",
                                search,
                                onSearchChange: (val: string) => { setSearch(val); setPage(0); }
                            } as any
                        }}
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
                        pageSizeOptions={[5, 10, 20]}
                        className="admin-datagrid"
                    sx={dataGridStyles}
                    />
                </Box>
            </Card>

            <DepartmentDialog
                open={openDialog}
                onClose={handleCloseDialog}
                onSave={handleSave}
                selectedItem={selectedItem}
            />
        </Box>
    );
};






