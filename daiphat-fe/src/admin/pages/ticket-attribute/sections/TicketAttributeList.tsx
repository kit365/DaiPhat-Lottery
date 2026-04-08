import { DataGrid } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { TicketAttributeToolbar } from './TicketAttributeToolbar';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { useTranslation } from 'react-i18next';
import { useTicketAttributes } from '../hooks/useTicketAttribute';
import { useAttributeColumns, columnsInitialState } from '../configs/column.config';
import {
    dataGridCardStyles,
    dataGridContainerStyles,
    dataGridStyles
} from '../configs/styles.config';

import { useState } from 'react';

export const TicketAttributeList = ({ isTrash = false }: { isTrash?: boolean }) => {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');

    const params = {
        page: page + 1,
        limit: pageSize,
        keyword: search,
        is_trash: isTrash
    };

    const { data: res, isLoading } = useTicketAttributes(params);
    const attributes = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };
    const localeText = useDataGridLocale();
    const columns = useAttributeColumns(isTrash);

    return (
        <Card elevation={0} sx={dataGridCardStyles}>
            <div style={dataGridContainerStyles}>
                <DataGrid
                    rows={attributes}
                    getRowId={(row) => row._id}
                    showToolbar
                    loading={isLoading}
                    columns={columns}
                    density="comfortable"
                    slots={{
                        toolbar: TicketAttributeToolbar as any,
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                {isLoading ? <CircularProgress size={32} /> : <span className='text-[1.125rem]'>Không có dữ liệu thông số</span>}
                            </Box>
                        )
                    }}
                    slotProps={{
                        toolbar: {
                            search,
                            onSearchChange: (val: string) => { setSearch(val); setPage(0); }
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
                    disableRowSelectionOnClick
                    sx={dataGridStyles}
                />
            </div>
        </Card>
    )
}
