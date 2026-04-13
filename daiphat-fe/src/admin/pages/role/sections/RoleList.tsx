import { DataGrid } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { getColumnsConfig, columnsInitialState } from '../configs/column.config';
import { RoleToolbar } from './RoleToolbar';
import { DATA_GRID_LOCALE_VN } from '../configs/localeText.config';
import {
    dataGridCardStyles,
    dataGridContainerStyles,
    dataGridStyles
} from '../configs/styles.config';
import { useRoles, useDeleteRole } from '../hooks/useRole';
import { useNavigate } from 'react-router-dom';
import { prefixAdmin } from '../../../constants/routes';
import { toast } from 'react-toastify';
import { confirmDelete } from "../../../utils/swal";

export const RoleList = () => {
    const navigate = useNavigate();
    const { data: roles = [], isLoading } = useRoles();
    const { mutate: deleteRole } = useDeleteRole();

    const handleDelete = (id: string) => {
        confirmDelete("Bạn có chắc chắn muốn xóa nhóm quyền này?", () => {
            deleteRole(id, {
                onSuccess: () => {
                    toast.success("Xóa nhóm quyền thành công!");
                }
            });
        });
    };

    const handleEdit = (id: string) => {
        navigate(`/${prefixAdmin}/role/edit/${id}`);
    };

    const columns = getColumnsConfig(handleEdit, handleDelete);

    return (
        <Card elevation={0} sx={{
            ...dataGridCardStyles,
            border: '1px solid rgba(145, 158, 171, 0.2)',
            transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            '&:hover': {
                boxShadow: "var(--customShadows-card)"
            }
        }}>
            <div style={dataGridContainerStyles}>
                <DataGrid
                    rows={roles}
                    getRowId={(row) => row._id}
                    showToolbar
                    loading={isLoading}
                    columns={columns}
                    density="comfortable"
                    slots={{
                        toolbar: RoleToolbar,
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                {isLoading ? <CircularProgress size={32} /> : <span className='text-[1.125rem]'>Không có dữ liệu để hiển thị</span>}
                            </Box>
                        )
                    }}
                    localeText={DATA_GRID_LOCALE_VN}
                    pagination
                    pageSizeOptions={[5, 10, 20]}
                    initialState={columnsInitialState}
                    getRowHeight={() => 'auto'}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={{
                        ...dataGridStyles,
                        '& .MuiDataGrid-row:hover': {
                            bgcolor: 'rgba(145, 158, 171, 0.04)'
                        }
                    }}
                />
            </div>
        </Card>
    );
};




