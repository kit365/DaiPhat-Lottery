export const DATA_GRID_LOCALE_VN = {
    paginationRowsPerPage: 'Số dòng mỗi trang:',
    paginationDisplayedRows: ({ from, to, count, estimated }: any) => {
        if (count === -1) {
            return `${from}–${to} của ${estimated ?? 'nhiều'}`;
        }
        return `${from}–${to} của ${count}`;
    },
};




