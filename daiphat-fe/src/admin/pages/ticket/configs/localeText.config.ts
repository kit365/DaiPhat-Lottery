export const DATA_GRID_LOCALE_VN = {
    // Filter
    filterPanelDeleteIconLabel: "Xóa",
    filterPanelLogicOperator: "Điều kiện",
    filterPanelOperator: "Toán tử",
    filterPanelColumns: "Cột",
    filterPanelInputLabel: "Giá trị",
    filterPanelInputPlaceholder: "Nhập giá trị",

    filterOperatorContains: "Chứa",
    filterOperatorDoesNotContain: "Không chứa",
    filterOperatorEquals: "Bằng",
    filterOperatorDoesNotEqual: "Không bằng",
    filterOperatorStartsWith: "Bắt đầu bằng",
    filterOperatorEndsWith: "Kết thúc bằng",
    filterOperatorIsEmpty: "Rỗng",
    filterOperatorIsNotEmpty: "Không rỗng",
    filterOperatorIsAnyOf: "Là một trong",

    // Columns
    toolbarColumns: "Cột",
    columnsManagementSearchTitle: "Tìm kiếm cột...",
    columnsManagementShowHideAllText: "Ẩn/Hiện tất cả",
    columnsManagementReset: "Đặt lại",

    // Pagination
    paginationRowsPerPage: 'Số dòng mỗi trang:',
    paginationDisplayedRows: ({ from, to, count, estimated }) => {
        if (count === -1) {
            return `${from}–${to} của ${estimated ?? 'nhiều'}`;
        }

        return `${from}–${to} của ${count}`;
    },
};



