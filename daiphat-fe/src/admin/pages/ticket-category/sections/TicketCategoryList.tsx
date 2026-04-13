import { DataGrid } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { TicketCategoryToolbar } from './TicketCategoryToolbar';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { useTranslation } from 'react-i18next';
import { useTicketCategoryColumns } from '../hooks/useTicketCategoryColumns';
import { columnsInitialState } from '../configs/column.config';
import {
    dataGridCardStyles,
    dataGridContainerStyles,
    dataGridStyles
} from '../configs/styles.config';
import { useTicketCategoryData } from '../hooks/useTicketCategory';
import { useEffect } from 'react';

export const TicketCategoryList = ({ isTrash = false }: { isTrash?: boolean }) => {
    const { t } = useTranslation();
    const {
        categories,
        pagination,
        isLoading,
        page,
        setPage,
        pageSize,
        setPageSize,
        search,
        setSearch,
        status,
        setStatus,
        setIsTrash
    } = useTicketCategoryData();

    // Đồng bộ prop isTrash vào hook khi thay đổi
    useEffect(() => {
        setIsTrash(isTrash);
    }, [isTrash, setIsTrash]);

    const columns = useTicketCategoryColumns(isTrash);
    const localeText = useDataGridLocale();

    return (
        <Card elevation={0} sx={dataGridCardStyles}>
            <div style={dataGridContainerStyles}>
                <DataGrid
                    rows={categories}
                    getRowId={(row) => row._id}
                    showToolbar
                    loading={isLoading}
                    columns={columns}
                    density="comfortable"
                    slots={{
                        toolbar: TicketCategoryToolbar as any,
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                {isLoading ? <CircularProgress size={32} /> : <span className='text-[1.125rem]'>Không có dữ liệu để hiển thị</span>}
                            </Box>
                        )
                    }}
                    slotProps={{
                        toolbar: {
                            search,
                            onSearchChange: (val: string) => { setSearch(val); setPage(0); },
                            status,
                            onStatusChange: (val: string[]) => { setStatus(val); setPage(0); }
                        } as any
                    }}
                    localeText={localeText}
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
                    initialState={columnsInitialState}
                    getRowHeight={() => 'auto'}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={dataGridStyles}
                />
            </div>
        </Card>
    )
}
