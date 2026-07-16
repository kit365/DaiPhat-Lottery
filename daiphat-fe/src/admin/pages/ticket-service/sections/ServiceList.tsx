import { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { TicketServiceToolbar } from './ServiceToolbar';
import { DATA_GRID_LOCALE_VN } from '../configs/localeText.config';
import { dataGridCardStyles, dataGridContainerStyles, dataGridStyles } from '../configs/styles.config';
import { useTicketServices } from '../hooks/useTicketService';

export const TicketServiceList = () => {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string[]>([]);

    const params = {
        page: page + 1,
        limit: pageSize,
        keyword: search,
        status: status[0],
    };

    const { data: res, isLoading } = useTicketServices(params);
    const ticketServices = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    return (
        <Card elevation={0} sx={dataGridCardStyles}>
            <div style={dataGridContainerStyles}>
                <DataGrid
                    rows={ticketServices}
                    getRowId={(row) => row._id}
                    loading={isLoading}
                    columns={columnsConfig}
                    density="comfortable"
                    slots={{
                        toolbar: TicketServiceToolbar as any,
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
                    pageSizeOptions={[5, 10, 20]}
                    initialState={columnsInitialState}
                    getRowHeight={() => 'auto'}
                    checkboxSelection
                    disableRowSelectionOnClick
                    className="admin-datagrid"
                    sx={dataGridStyles}
                />
            </div>
        </Card>
    )
}




