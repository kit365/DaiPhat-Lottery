"use client";

import { useMemo, useState } from 'react';
import { LazyDataGrid } from '@/admin/shared/data-grid/LazyDataGrid';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { getColumnsConfig, columnsInitialState } from '../configs/column.config';
import { BlogCategoryToolbar } from './BlogCategoryToolbar';
import { DATA_GRID_LOCALE_VN } from "@/admin/components/data-grid/localeText.config";
import { dataGridStyles } from "../../../../shared/data-grid";
import { useBlogCategories } from "../../hooks/useBlogCategory";

export const BlogCategoryList = ({ isTrash = false }: { isTrash?: boolean }) => {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string[]>([]);

    const params = {
        page: page + 1,
        limit: pageSize,
        keyword: search || undefined,
        status: status.length > 0 ? status.join(',') : undefined,
        is_trash: isTrash || undefined,
    };

    const { data: res, isLoading } = useBlogCategories(params);

    const categories = useMemo(() => {
        const anyRes = res as any;
        if (!anyRes) return [];
        if (Array.isArray(anyRes.data?.recordList)) return anyRes.data.recordList;
        if (Array.isArray(anyRes.recordList)) return anyRes.recordList;
        if (Array.isArray(anyRes.data)) return anyRes.data;
        if (Array.isArray(anyRes)) return anyRes;
        return [];
    }, [res]);

    const pagination = (res as any)?.data?.pagination || (res as any)?.pagination || { totalRecords: categories.length };

    const columns = useMemo(() => getColumnsConfig(isTrash), [isTrash]);

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <LazyDataGrid
                    rows={categories}
                    getRowId={(row: any) => row?.id ?? row?._id}
                    loading={isLoading}
                    columns={columns}
                    density="comfortable"
                    disableColumnMenu
                    disableColumnSorting
                    className="admin-datagrid"
                    sx={dataGridStyles}
                    slots={{
                        toolbar: BlogCategoryToolbar as any,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                {isLoading ? <CircularProgress size={32} /> : <span className='text-[1.125rem]'>Không có dữ liệu</span>}
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
                    disableRowSelectionOnClick
                />
            </div>
        </Card>
    );
};
