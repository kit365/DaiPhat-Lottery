export const DATA_GRID_LOCALE_VN = {
    paginationRowsPerPage: 'Số dòng mỗi trang:',
    paginationDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
        `${from}–${to} của ${count}`,
};
