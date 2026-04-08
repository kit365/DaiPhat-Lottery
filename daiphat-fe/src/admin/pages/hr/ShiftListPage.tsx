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
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from './hooks/useShifts';
import { getShiftColumns } from './configs/shift.config';
import { ShiftDialog } from './sections/ShiftDialog';
import { toast } from 'react-toastify';
import { confirmDelete } from '../../utils/swal';
import { dataGridCardStyles, dataGridContainerStyles, dataGridStyles, primaryButtonStyles } from './configs/styles.config';
import { HRToolbar } from './sections/HRToolbar';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../assets/icons';

export const ShiftListPage = () => {
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

    const { data: res, isLoading } = useShifts(params);
    const shifts = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const { mutate: createShift } = useCreateShift();
    const { mutate: updateShift } = useUpdateShift();
    const { mutate: deleteShift } = useDeleteShift();

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
            updateShift({ id: selectedItem._id, data }, {
                onSuccess: (res: any) => {
                    toast.success(res.message || 'Cập nhật thành công');
                    handleCloseDialog();
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
                }
            });
        } else {
            createShift(data, {
                onSuccess: (res: any) => {
                    toast.success(res.message || 'Thêm thành công');
                    handleCloseDialog();
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
                }
            });
        }
    };

    const handleDelete = (id: string) => {
        confirmDelete('Bạn có chắc chắn muốn xóa ca làm việc này?', () => {
            deleteShift(id, {
                onSuccess: () => {
                    toast.success('Xóa ca làm việc thành công');
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || 'Lỗi khi xóa ca làm việc');
                }
            });
        });
    };

    const columns = getShiftColumns(
        (id) => handleOpenDialog(shifts.find((s: any) => s._id === id)),
        handleDelete
    );

    return (
        <Box sx={{ p: "calc(3 * var(--spacing))" }}>
            <Box sx={{ mb: '40px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Title title="Quản lý Ca làm việc" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: `/${prefixAdmin}` },
                            { label: "Ca làm việc" }
                        ]}
                    />
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={primaryButtonStyles}
                >
                    Tạo ca trực
                </Button>
            </Box>

            <Card sx={dataGridCardStyles}>
                <Box sx={dataGridContainerStyles}>
                    <DataGrid
                        rows={shifts}
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
                                searchPlaceholder: "Tìm kiếm ca trực...",
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
                        sx={dataGridStyles}
                    />
                </Box>
            </Card>

            <ShiftDialog
                open={openDialog}
                onClose={handleCloseDialog}
                onSave={handleSave}
                selectedItem={selectedItem}
            />
        </Box>
    );
};






