import { useCallback, useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';

/** 0-based page state for MUI DataGrid server pagination; API calls use `apiPage` (1-based). */
export function useServerPagination(initialPageSize = 10) {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const resetPage = useCallback(() => setPage(0), []);

    const paginationModel: GridPaginationModel = { page, pageSize };

    const onPaginationModelChange = useCallback((model: GridPaginationModel) => {
        setPage(model.page);
        setPageSize(model.pageSize);
    }, []);

    return {
        page,
        pageSize,
        apiPage: page + 1,
        paginationModel,
        onPaginationModelChange,
        resetPage,
    };
}
