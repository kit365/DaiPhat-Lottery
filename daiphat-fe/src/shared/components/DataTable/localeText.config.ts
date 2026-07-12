export const DATA_GRID_LOCALE_VN = {
    // Pagination
    paginationRowsPerPage: 'Số dòng mỗi trang:',
    paginationDisplayedRows: ({ from, to, count, estimated }) => {
        if (count === -1) {
            return `${from}–${to} của ${estimated ?? 'nhiều'}`;
        }

        return `${from}–${to} của ${count}`;
    },
};




